import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { runAllJobs } from './billingJobs';

let tasks: ScheduledTask[] = [];

/**
 * Start billing cron jobs.
 *
 * Schedule:
 *  - Reconciliation: every 6 hours
 *  - Grace period expiry: hourly
 *  - Expire canceled subs: daily at midnight
 *  - Trial reminders: daily at 8 AM
 */
export function startBillingScheduler(): void {
  if (tasks.length > 0) {
    console.log('[BillingScheduler] Already running');
    return;
  }

  // Every 6 hours: reconcile with provider
  tasks.push(cron.schedule('0 */6 * * *', () => {
    console.log('[BillingScheduler] Running reconciliation...');
    runAllJobs().catch((err) => console.error('[BillingScheduler] Reconciliation error:', err.message));
  }));

  // Every hour: check grace period expiry
  tasks.push(cron.schedule('0 * * * *', async () => {
    console.log('[BillingScheduler] Checking grace periods...');
    const { expireGracePeriods, expireCanceledSubscriptions } = await import('./billingJobs');
    await expireGracePeriods().catch((err: any) => console.error('[BillingScheduler] Grace period error:', err.message));
  }));

  // Daily at 00:00: expire canceled/suspended subs past period end
  tasks.push(cron.schedule('0 0 * * *', async () => {
    console.log('[BillingScheduler] Expiring canceled subscriptions...');
    const { expireCanceledSubscriptions } = await import('./billingJobs');
    await expireCanceledSubscriptions().catch((err: any) => console.error('[BillingScheduler] Expire error:', err.message));
  }));

  // Daily at 8:00: send trial ending reminders
  tasks.push(cron.schedule('0 8 * * *', async () => {
    console.log('[BillingScheduler] Sending trial reminders...');
    const { sendTrialEndingReminders } = await import('./billingJobs');
    await sendTrialEndingReminders().catch((err: any) => console.error('[BillingScheduler] Trial reminder error:', err.message));
  }));

  // Every 6 hours: execute pending downgrades
  tasks.push(cron.schedule('0 */6 * * *', async () => {
    console.log('[BillingScheduler] Checking pending downgrades...');
    const { executePendingDowngrades } = await import('./billingJobs');
    await executePendingDowngrades().catch((err: any) => console.error('[BillingScheduler] Downgrade error:', err.message));
  }));

  console.log('[BillingScheduler] Started (reconcile: 6h, grace: 1h, expire: daily, trial reminder: daily 8am, downgrade: 6h)');
}

export function stopBillingScheduler(): void {
  tasks.forEach((t) => t.stop());
  tasks = [];
  console.log('[BillingScheduler] Stopped');
}
