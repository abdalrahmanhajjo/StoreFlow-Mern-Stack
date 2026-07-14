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