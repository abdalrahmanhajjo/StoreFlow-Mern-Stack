// backend/src/scripts/seedEmailTemplates.ts
// Run once (or any time you want to reset to defaults): ts-node src/scripts/seedEmailTemplates.ts
// Upserts by slug, so it's safe to re-run — won't duplicate or wipe edits
// unless you delete a template first.

import 'dotenv/config';
import mongoose from 'mongoose';
import { EmailTemplate } from '../models/email_templates.model';

const TEMPLATES = [
  {
    name: "Email Verification",
    slug: "email-verification",
    subject: "Verify Your Email Address",
    html: "<div style=\"font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;\">\n  <h2 style=\"color: #1f2937; margin-bottom: 10px;\">Verify your email address</h2>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">Thank you for registering! Please use the following one-time verification code to complete your registration. This code is valid for 10 minutes:</p>\n  <div style=\"text-align: center; margin: 30px 0;\">\n    <span style=\"font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; background-color: #eff6ff; padding: 10px 24px; border-radius: 6px; border: 1px dashed #bfdbfe;\">\n      {{code}}\n    </span>\n  </div>\n  <p style=\"color: #9ca3af; font-size: 13px;\">If you did not request this code, please ignore this email.</p>\n</div>",
    text: "Thank you for registering! Please use the following one-time verification code to complete your registration: {{code}}. This code is valid for 10 minutes.",
    description: "Sent to new users when registering to verify their email address.",
    variables: ["code"],
    isActive: true,
    isSystem: true,
  },
  {
    name: "Password Reset",
    slug: "password-reset",
    subject: "Reset Your Password",
    html: "<div style=\"font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;\">\n  <h2 style=\"color: #1f2937; margin-bottom: 10px;\">Reset your password</h2>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">We received a request to reset your password. Use the verification code below to set up a new password. This code is valid for 10 minutes:</p>\n  <div style=\"text-align: center; margin: 30px 0;\">\n    <span style=\"font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #dc2626; background-color: #fef2f2; padding: 10px 24px; border-radius: 6px; border: 1px dashed #fecaca;\">\n      {{code}}\n    </span>\n  </div>\n  <p style=\"color: #9ca3af; font-size: 13px;\">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>\n</div>",
    text: "We received a request to reset your password. Use the verification code below to set up a new password: {{code}}. This code is valid for 10 minutes.",
    description: "Sent to users who forgot their passwords and need a reset code.",
    variables: ["code"],
    isActive: true,
    isSystem: true,
  },
  {
    name: "Employee Invite",
    slug: "employee-invite",
    subject: "You've been invited to join {{storeName}}",
    html: "<div style=\"font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;\">\n  <h2 style=\"color: #1f2937; margin-bottom: 10px;\">Join the team at {{storeName}}</h2>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">Hello {{name}},</p>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">You have been invited to join the team at <strong>{{storeName}}</strong> as a <strong>{{role}}</strong>. Click the button below to complete your account setup and choose your password:</p>\n  <div style=\"text-align: center; margin: 30px 0;\">\n    <a href=\"{{inviteUrl}}\" style=\"display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 16px; font-weight: bold; border-radius: 6px;\">Join Team</a>\n  </div>\n  <p style=\"color: #4b5563; font-size: 14px; line-height: 1.5;\">Or copy and paste this link into your browser:</p>\n  <p style=\"color: #2563eb; font-size: 13px; word-break: break-all;\">{{inviteUrl}}</p>\n  <p style=\"color: #9ca3af; font-size: 13px; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px;\">This invitation link is valid for 24 hours.</p>\n</div>",
    text: "Hello {{name}},\n\nYou have been invited to join the team at {{storeName}} as a {{role}}. Please complete your account setup by clicking the following link: {{inviteUrl}}\n\nThis invitation link is valid for 24 hours.",
    description: "Sent to newly added employees with a link to finalize their profiles.",
    variables: ["name", "storeName", "role", "inviteUrl"],
    isActive: true,
    isSystem: true,
  },
  {
    name: "Store Approved — Welcome",
    slug: "store-approved",
    subject: "🎉 {{storeName}} is approved — welcome to StoreFlow!",
    html: "<div style=\"font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;\">\n  <h2 style=\"color: #1f2937; margin-bottom: 10px;\">Welcome aboard, {{name}}! 🎉</h2>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">Great news — <strong>{{storeName}}</strong> has been reviewed and approved. Your store is now live and you can sign in and start selling.</p>\n  <div style=\"text-align: center; margin: 30px 0;\">\n    <a href=\"{{loginUrl}}\" style=\"display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 16px; font-weight: bold; border-radius: 6px;\">Sign in to your store</a>\n  </div>\n  <p style=\"color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 6px;\"><strong>A few good first steps:</strong></p>\n  <ul style=\"color: #4b5563; font-size: 14px; line-height: 1.8; padding-left: 20px; margin-top: 0;\">\n    <li>Add your first products to the catalog</li>\n    <li>Invite your staff from the Employees page</li>\n    <li>Ring up a sale in the POS</li>\n    <li>Review your plan anytime under Settings → Billing</li>\n  </ul>\n  <p style=\"color: #9ca3af; font-size: 13px; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px;\">Need a hand? Just reply to this email — we're happy to help you get set up.</p>\n</div>",
    text: "Welcome aboard, {{name}}!\n\nGreat news — {{storeName}} has been reviewed and approved. Your store is now live and you can sign in and start selling: {{loginUrl}}\n\nGood first steps: add your products, invite your staff, ring up a sale in the POS, and review your plan under Settings → Billing.\n\nNeed a hand? Just reply to this email.",
    description: "Sent to the store owner when a platform admin approves their registration.",
    variables: ["name", "storeName", "loginUrl"],
    isActive: true,
    isSystem: true,
  },
  {
    name: "Subscription Activated",
    slug: "subscription-activated",
    subject: "Your StoreFlow subscription is active",
    html: "<div style=\"font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;\">\n  <h2 style=\"color: #1f2937; margin-bottom: 10px;\">Welcome to {{planName}}!</h2>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">Your StoreFlow <strong>{{planName}}</strong> subscription is now active.</p>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">You can now set up your store, add products, and start selling.</p>\n  <p style=\"color: #9ca3af; font-size: 13px; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px;\">Questions? Just reply to this email.</p>\n</div>",
    text: "Welcome to {{planName}}! Your StoreFlow {{planName}} subscription is now active. You can now set up your store, add products, and start selling.",
    description: "Sent when a paid subscription is activated after checkout.",
    variables: ["planName"],
    isActive: true,
    isSystem: true,
  },
  {
    name: "Plan Upgraded",
    slug: "plan-upgraded",
    subject: "Your StoreFlow plan has been upgraded",
    html: "<div style=\"font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;\">\n  <h2 style=\"color: #1f2937; margin-bottom: 10px;\">Upgraded to {{planName}}</h2>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">Your StoreFlow subscription has been upgraded to <strong>{{planName}}</strong>.</p>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">You now have access to additional features and higher limits.</p>\n</div>",
    text: "Your StoreFlow subscription has been upgraded to {{planName}}. You now have access to additional features and higher limits.",
    description: "Sent when a subscription moves to a higher plan.",
    variables: ["planName"],
    isActive: true,
    isSystem: true,
  },
  {
    name: "Downgrade Scheduled",
    slug: "plan-downgraded",
    subject: "Your StoreFlow downgrade is scheduled",
    html: "<div style=\"font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;\">\n  <h2 style=\"color: #1f2937; margin-bottom: 10px;\">Downgrade scheduled</h2>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">Your plan will be downgraded to <strong>{{planName}}</strong> on <strong>{{effectiveDate}}</strong>.</p>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">Some features may become unavailable after this date. To cancel the downgrade, visit your billing settings before then.</p>\n</div>",
    text: "Your plan will be downgraded to {{planName}} on {{effectiveDate}}. Some features may become unavailable after this date.",
    description: "Sent when a downgrade is scheduled for the end of the billing period.",
    variables: ["planName", "effectiveDate"],
    isActive: true,
    isSystem: true,
  },
  {
    name: "Subscription Cancelled",
    slug: "subscription-cancelled",
    subject: "Your StoreFlow subscription has been cancelled",
    html: "<div style=\"font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;\">\n  <h2 style=\"color: #1f2937; margin-bottom: 10px;\">Cancellation confirmed</h2>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">Your StoreFlow subscription will end on <strong>{{effectiveDate}}</strong>. You keep full access until then.</p>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">Changed your mind? You can reactivate from your billing settings any time before that date.</p>\n</div>",
    text: "Your StoreFlow subscription will end on {{effectiveDate}}. You keep full access until then. You can reactivate from your billing settings before that date.",
    description: "Sent when the user cancels their subscription (end-of-period).",
    variables: ["effectiveDate"],
    isActive: true,
    isSystem: true,
  },
  {
    name: "Subscription Reactivated",
    slug: "subscription-reactivated",
    subject: "Your StoreFlow subscription has been reactivated",
    html: "<div style=\"font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;\">\n  <h2 style=\"color: #1f2937; margin-bottom: 10px;\">Subscription reactivated</h2>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">Your StoreFlow subscription has been reactivated — the scheduled cancellation was removed and your access continues as normal.</p>\n</div>",
    text: "Your StoreFlow subscription has been reactivated. The scheduled cancellation was removed and your access continues as normal.",
    description: "Sent when a scheduled cancellation is reverted.",
    variables: [],
    isActive: true,
    isSystem: true,
  },
  {
    name: "Payment Failed",
    slug: "payment-failed",
    subject: "Action required: StoreFlow payment failed",
    html: "<div style=\"font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;\">\n  <h2 style=\"color: #dc2626; margin-bottom: 10px;\">Payment failed</h2>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">We couldn't process your latest subscription payment.</p>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">Your account stays accessible until <strong>{{gracePeriodEnd}}</strong>. Please update your payment method before then to avoid any interruption.</p>\n</div>",
    text: "We couldn't process your latest subscription payment. Your account stays accessible until {{gracePeriodEnd}}. Please update your payment method before then.",
    description: "Sent when a recurring payment fails and the grace period starts.",
    variables: ["gracePeriodEnd"],
    isActive: true,
    isSystem: true,
  },
  {
    name: "Trial Ending Soon",
    slug: "trial-ending",
    subject: "Your {{planName}} trial ends soon",
    html: "<div style=\"font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;\">\n  <h2 style=\"color: #1f2937; margin-bottom: 10px;\">Trial ending soon</h2>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">Your <strong>{{planName}}</strong> free trial ends on <strong>{{endDate}}</strong>.</p>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">Upgrade to a paid plan to keep your access and all your data.</p>\n</div>",
    text: "Your {{planName}} free trial ends on {{endDate}}. Upgrade to a paid plan to keep your access and all your data.",
    description: "Reminder sent shortly before a free trial expires.",
    variables: ["planName", "endDate"],
    isActive: true,
    isSystem: true,
  },
  {
    name: "Account Deleted",
    slug: "account-deleted",
    subject: "Your StoreFlow account has been deleted",
    html: "<div style=\"font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;\">\n  <h2 style=\"color: #1f2937; margin-bottom: 10px;\">Account deleted</h2>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">Hi {{name}},</p>\n  <p style=\"color: #4b5563; font-size: 16px; line-height: 1.5;\">{{details}} Any paid subscription was cancelled immediately. Past invoices remain available on request for accounting purposes.</p>\n  <p style=\"color: #9ca3af; font-size: 13px; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px;\">We're sorry to see you go. If you did not request this, contact support immediately.</p>\n</div>",
    text: "Hi {{name}}, {{details}} Any paid subscription was cancelled immediately. Past invoices remain available on request. If you did not request this, contact support immediately.",
    description: "Confirmation sent after an account (and, for owners, their store data) is permanently deleted.",
    variables: ["name", "details"],
    isActive: true,
    isSystem: true,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("Connected. Seeding email templates...");

  for (const t of TEMPLATES) {
    await EmailTemplate.findOneAndUpdate(
      { slug: t.slug },
      { $set: t },
      { upsert: true, new: true, runValidators: true }
    );
    console.log(`  ✓ ${t.slug}`);
  }

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});