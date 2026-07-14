import { Schema, model, Document } from "mongoose";

export interface IEmailTemplate extends Document {
  name: string;
  slug: string;
  subject: string;
  html: string;
  text?: string;
  description?: string;
  variables: string[];
  isActive: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const emailTemplateSchema = new Schema<IEmailTemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 100,
      match: /^[a-z0-9-]+$/,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    html: {
      type: String,
      required: true,
    },

    text: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
      maxlength: 500,
    },

    variables: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Built-in templates (password reset, invite, etc.)
    // cannot be deleted.
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate names regardless of letter case.
emailTemplateSchema.index(
  { name: 1 },
  {
    unique: true,
    collation: {
      locale: "en",
      strength: 2,
    },
  }
);

export const EmailTemplate = model<IEmailTemplate>(
  "EmailTemplate",
  emailTemplateSchema
);