import { BillingAccount } from '../models/billingAccount.model';
import { sendDynamicTemplateEmail } from './mail.utils';

// Every billing email is template-driven: the subject/HTML live in the
// EmailTemplate collection (admin-editable in /admin/system-settings), not
// here. Each helper resolves the account's billing address and passes the
// template's variables.

async function sendBillingTemplate(
  accountId: string,
  slug: string,
  variables: Record<string, string> = {},
): Promise<boolean> {
  const account = await BillingAccount.findById(accountId).lean();
  if (!account) return false;

  const to = account.billingEmail || account.email;
  return sendDynamicTemplateEmail(to, slug, variables);
}

export const billingMail = {
  async subscriptionActivated(accountId: string, planName: string): Promise<boolean> {
    return sendBillingTemplate(accountId, 'subscription-activated', { planName });
  },

  async planUpgraded(accountId: string, planName: string): Promise<boolean> {
    return sendBillingTemplate(accountId, 'plan-upgraded', { planName });
  },

  async planDowngraded(accountId: string, planName: string, effectiveDate: string): Promise<boolean> {
    return sendBillingTemplate(accountId, 'plan-downgraded', { planName, effectiveDate });
  },

  async subscriptionCancelled(accountId: string, effectiveDate: string): Promise<boolean> {
    return sendBillingTemplate(accountId, 'subscription-cancelled', { effectiveDate });
  },

  async subscriptionReactivated(accountId: string): Promise<boolean> {
    return sendBillingTemplate(accountId, 'subscription-reactivated');
  },

  async paymentFailed(accountId: string, gracePeriodEnd: string): Promise<boolean> {
    return sendBillingTemplate(accountId, 'payment-failed', { gracePeriodEnd });
  },

  async trialEndingSoon(accountId: string, planName: string, endDate: string): Promise<boolean> {
    return sendBillingTemplate(accountId, 'trial-ending', { planName, endDate });
  },
};
