import { sendMailSafe } from './auth.utils';
import { BillingAccount } from '../models/billingAccount.model';
import { User } from '../models/user.model';

const APP_NAME = 'StoreFlow';
const SUPPORT_EMAIL = 'support@storeflow.com';

async function sendBillingEmail(
  accountId: string,
  subject: string,
  html: string,
  label: string,
): Promise<boolean> {
  const account = await BillingAccount.findById(accountId).lean();
  if (!account) return false;

  const to = account.billingEmail || account.email;
  return sendMailSafe(to, subject, html, `billing-${label}`);
}

export const billingMail = {
  async subscriptionActivated(accountId: string, planName: string): Promise<boolean> {
    return sendBillingEmail(
      accountId,
      `Your ${APP_NAME} subscription is active`,
      `
        <h2>Welcome to ${planName}!</h2>
        <p>Your ${APP_NAME} ${planName} subscription is now active.</p>
        <p>You can now set up your store, add products, and start selling.</p>
        <p>If you have any questions, contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      `,
      'activated',
    );
  },

  async planUpgraded(accountId: string, planName: string): Promise<boolean> {
    return sendBillingEmail(
      accountId,
      `Your ${APP_NAME} plan has been upgraded`,
      `
        <h2>Upgraded to ${planName}</h2>
        <p>Your ${APP_NAME} subscription has been upgraded to <strong>${planName}</strong>.</p>
        <p>You now have access to additional features and higher limits.</p>
      `,
      'upgraded',
    );
  },

  async planDowngraded(accountId: string, planName: string, effectiveDate: string): Promise<boolean> {
    return sendBillingEmail(
      accountId,
      `Your ${APP_NAME} downgrade is scheduled`,
      `
        <h2>Downgrade Scheduled</h2>
        <p>Your plan will be downgraded to <strong>${planName}</strong> on <strong>${effectiveDate}</strong>.</p>
        <p>Some features may become unavailable after this date.</p>
        <p>If you'd like to cancel this downgrade, visit your billing settings before the effective date.</p>
      `,
      'downgraded',
    );
  },

  async subscriptionCancelled(accountId: string, effectiveDate: string): Promise<boolean> {
    return sendBillingEmail(
      accountId,
      `Your ${APP_NAME} subscription has been cancelled`,
      `
        <h2>Cancellation Confirmed</h2>
        <p>Your ${APP_NAME} subscription will end on <strong>${effectiveDate}</strong>.</p>
        <p>You will continue to have access until this date.</p>
        <p>If you'd like to reactivate, visit your billing settings before the cancellation date.</p>
      `,
      'cancelled',
    );
  },

  async subscriptionReactivated(accountId: string): Promise<boolean> {
    return sendBillingEmail(
      accountId,
      `Your ${APP_NAME} subscription has been reactivated`,
      `
        <h2>Subscription Reactivated</h2>
        <p>Your ${APP_NAME} subscription has been reactivated. Your access will continue as normal.</p>
      `,
      'reactivated',
    );
  },

  async paymentFailed(accountId: string, gracePeriodEnd: string): Promise<boolean> {
    return sendBillingEmail(
      accountId,
      `Action required: ${APP_NAME} payment failed`,
      `
        <h2>Payment Failed</h2>
        <p>We were unable to process your latest subscription payment.</p>
        <p>Your account will remain accessible until <strong>${gracePeriodEnd}</strong>.</p>
        <p>Please update your payment method to avoid service interruption.</p>
      `,
      'payment-failed',
    );
  },

  async trialEndingSoon(accountId: string, planName: string, endDate: string): Promise<boolean> {
    return sendBillingEmail(
      accountId,
      `Your ${planName} trial ends soon`,
      `
        <h2>Trial Ending Soon</h2>
        <p>Your ${planName} free trial will end on <strong>${endDate}</strong>.</p>
        <p>Upgrade to a paid plan to keep your access and all your data.</p>
      `,
      'trial-ending',
    );
  },
};
