import { Subscription } from '../../models/subscription.model';
import { Plan } from '../../models/plan.model';
import { BillingAccount } from '../../models/billingAccount.model';
import { User } from '../../models/user.model';
import { getBillingProvider } from './provider';
import { billingMail } from '../../utils/billing-mail.utils';

function log(job: string, message: string): void {
  console.log(`[BillingJob/${job}] ${message}`);
}

function toDate(ts: number | undefined): Date | undefined {
  return ts ? new Date(ts * 1000) : undefined;
}

/**
 * 1. Provider Reconciliation Job
 * For each active/trialing/past_due subscription on a Stripe provider,
 * fetch the current state from the payment provider and sync status/dates.
 */
export async function reconcileSubscriptions(): Promise<{ checked: number; updated: number; errors: number }> {
  log('reconcile', 'Starting provider reconciliation...');
  let checked = 0;
  let updated = 0;
  let errors = 0;

  const subs = await Subscription.find({
    provider: { $ne: 'manual' },
    status: { $in: ['active', 'trialing', 'past_due'] },
    providerSubscriptionId: { $exists: true, $ne: null },
  }).select('+providerSubscriptionId +providerCustomerId').lean();

  const provider = getBillingProvider();

  for (const sub of subs) {
    try {
      checked++;
      if (!sub.providerSubscriptionId) continue;
      const remote = await provider.getSubscription(sub.providerSubscriptionId);
      if (!remote) {
        log('reconcile', `Subscription ${sub.publicId}: not found at provider, marking expired`);
        await Subscription.findByIdAndUpdate(sub._id, { status: 'expired', expiredAt: new Date() });
        updated++;
        continue;
      }

      const updates: Record<string, any> = { lastProviderSyncAt: new Date() };
      let changed = false;

      const remoteStatus = remote.status;
      if (remoteStatus && remoteStatus !== sub.status) {
        updates.status = remoteStatus;
        changed = true;
      }

      const remotePeriodStart = toDate(remote.currentPeriodStart);
      const remotePeriodEnd = toDate(remote.currentPeriodEnd);

      if (remotePeriodStart && (!sub.currentPeriodStart || remotePeriodStart.getTime() !== sub.currentPeriodStart.getTime())) {
        updates.currentPeriodStart = remotePeriodStart;
        changed = true;
      }
      if (remotePeriodEnd && (!sub.currentPeriodEnd || remotePeriodEnd.getTime() !== sub.currentPeriodEnd.getTime())) {
        updates.currentPeriodEnd = remotePeriodEnd;
        changed = true;
      }
      if (remote.cancelAtPeriodEnd !== undefined && remote.cancelAtPeriodEnd !== sub.cancelAtPeriodEnd) {
        updates.cancelAtPeriodEnd = remote.cancelAtPeriodEnd;
        changed = true;
      }

      if (changed) {
        await Subscription.findByIdAndUpdate(sub._id, { $set: updates });
        updated++;
        log('reconcile', `${sub.publicId}: synced (status=${remoteStatus}, periodEnd=${remotePeriodEnd?.toISOString()})`);
      }
    } catch (err: any) {
      errors++;
      log('reconcile', `Error for ${sub.publicId}: ${err.message}`);
    }
  }

  log('reconcile', `Done: ${checked} checked, ${updated} updated, ${errors} errors`);
  return { checked, updated, errors };
}

/**
 * 2. Grace Period Expiry Job
 * Subscriptions with `grace_period` or `past_due` past their grace threshold → suspended.
 */
export async function expireGracePeriods(): Promise<{ suspended: number }> {
  log('gracePeriod', 'Checking expired grace periods...');
  const now = new Date();
  let suspended = 0;

  const gracePeriodDays = parseInt(process.env.BILLING_GRACE_PERIOD_DAYS ?? '7', 10);
  const graceThreshold = new Date(now.getTime() - gracePeriodDays * 86400000);

  const expired = await Subscription.find({
    status: { $in: ['grace_period', 'past_due'] },
    $or: [
      { gracePeriodEndsAt: { $lte: now } },
      { gracePeriodEndsAt: { $exists: false } },
      { pastDueSince: { $lte: graceThreshold } },
    ],
  });

  for (const sub of expired) {
    sub.status = 'suspended';
    sub.suspendedAt = now;
    await sub.save();
    suspended++;
    log('gracePeriod', `Suspended ${sub.publicId}`);
  }

  log('gracePeriod', `Suspended ${suspended} subscriptions`);
  return { suspended };
}

/**
 * 3. Past-Due / Canceled → Expiration Job
 * Canceled/suspended subscriptions past their period_end → expired.
 */
export async function expireCanceledSubscriptions(): Promise<{ expired: number }> {
  log('expireCanceled', 'Checking canceled subscriptions past period end...');
  const now = new Date();
  let expired = 0;

  const canceled = await Subscription.find({
    status: { $in: ['cancelled', 'suspended'] },
    currentPeriodEnd: { $lte: now },
  });

  for (const sub of canceled) {
    sub.status = 'expired';
    sub.expiredAt = now;
    await sub.save();
    expired++;
    log('expireCanceled', `Expired ${sub.publicId}`);
  }

  log('expireCanceled', `Expired ${expired} subscriptions`);
  return { expired };
}

/**
 * 5. Execute Pending Downgrades
 * Subscriptions with a scheduled downgrade past their period_end get the plan
 * changed and the pendingDowngrade metadata cleared.
 */
export async function executePendingDowngrades(): Promise<{ executed: number; errors: number }> {
  log('downgrade', 'Checking pending downgrades...');
  let executed = 0;
  let errors = 0;

  const subs = await Subscription.find({
    status: { $in: ['active', 'trialing'] },
    'metadata.pendingDowngradePlanId': { $exists: true },
    currentPeriodEnd: { $lte: new Date() },
  });

  for (const sub of subs) {
    try {
      const targetPlanId = sub.metadata?.pendingDowngradePlanId;
      if (!targetPlanId) continue;

      const targetPlan = await Plan.findById(targetPlanId);
      if (!targetPlan) {
        log('downgrade', `${sub.publicId}: target plan ${targetPlanId} not found, clearing`);
        await Subscription.updateOne(
          { _id: sub._id },
          { $unset: { 'metadata.pendingDowngradePlanId': '', 'metadata.pendingDowngradeAt': '' } },
        );
        continue;
      }

      sub.plan = targetPlan._id;
      sub.planVersion = targetPlan.version ?? 1;
      sub.billingInterval = sub.billingInterval;
      sub.currency = targetPlan.billing.currency;
      sub.amountMinor = targetPlan.billing.monthlyPriceMinor; // keep current interval
      sub.currentPeriodStart = new Date();
      sub.currentPeriodEnd = new Date(Date.now() + 30 * 86400000);
      if (sub.metadata) {
        delete sub.metadata.pendingDowngradePlanId;
        delete sub.metadata.pendingDowngradeAt;
      }
      await sub.save();

      executed++;
      log('downgrade', `Applied downgrade for ${sub.publicId} to ${targetPlan.code}`);

      // Send downgrade email
      try {
        const planName = targetPlan.name;
        const effectiveDate = new Date().toISOString().split('T')[0];
        await billingMail.planDowngraded(sub.account.toString(), planName, effectiveDate);
      } catch (_) { /* email best-effort */ }
    } catch (err: any) {
      errors++;
      log('downgrade', `Error for ${sub.publicId}: ${err.message}`);
    }
  }

  log('downgrade', `Done: ${executed} executed, ${errors} errors`);
  return { executed, errors };
}

/**
 * 4. Trial Expiration Reminder Job
 * Send reminder emails for trials ending within the configured window.
 */
export async function sendTrialEndingReminders(): Promise<{ reminded: number }> {
  log('trialReminder', 'Checking trials ending soon...');
  const now = new Date();
  const reminderDays = parseInt(process.env.BILLING_TRIAL_REMINDER_DAYS ?? '3', 10);
  const windowEnd = new Date(now.getTime() + reminderDays * 86400000);
  let reminded = 0;

  const trials = await Subscription.find({
    status: 'trialing',
    trialEnd: { $gte: now, $lte: windowEnd },
  }).populate('plan');

  for (const sub of trials) {
    if (!sub.trialEnd) continue;
    try {
      const planName = (sub.plan as any)?.name ?? 'Unknown';
      const accountId = sub.account.toString();
      const endDate = sub.trialEnd.toISOString().split('T')[0];

      await billingMail.trialEndingSoon(accountId, planName, endDate);
      reminded++;
      log('trialReminder', `Reminded account ${accountId} about ${sub.publicId}`);
    } catch (err: any) {
      log('trialReminder', `Error for ${sub.publicId}: ${err.message}`);
    }
  }

  log('trialReminder', `Sent ${reminded} reminders`);
  return { reminded };
}

/**
 * Run all billing maintenance jobs sequentially.
 */
export async function runAllJobs(): Promise<void> {
  log('runner', '=== Billing Jobs Run Started ===');
  const results: Record<string, any> = {};

  try { results.reconcile = await reconcileSubscriptions(); } catch (e: any) { results.reconcile = { error: e.message }; }
  try { results.gracePeriod = await expireGracePeriods(); } catch (e: any) { results.gracePeriod = { error: e.message }; }
  try { results.expireCanceled = await expireCanceledSubscriptions(); } catch (e: any) { results.expireCanceled = { error: e.message }; }
  try { results.trialReminder = await sendTrialEndingReminders(); } catch (e: any) { results.trialReminder = { error: e.message }; }
  try { results.downgrade = await executePendingDowngrades(); } catch (e: any) { results.downgrade = { error: e.message }; }

  log('runner', JSON.stringify(results, null, 2));
  log('runner', '=== Billing Jobs Run Complete ===');
}
