import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings {
  _id?: string;
  academyName: string;
  academyLogo: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  receiptPrefix: string;
  receiptFooterMessage: string;
  currencySymbol: string;
  selectedBranch?: string;
  branches?: Record<
    string,
    {
      address?: string;
      phone?: string;
      email?: string;
      website?: string;
      receiptPrefix?: string;
      receiptFooterMessage?: string;
    }
  >;
  updatedAt?: string | Date;
}

export interface ISettingsDocument extends Omit<ISettings, '_id'>, Document {}

const SettingsSchema = new Schema<ISettingsDocument>(
  {
    academyName: {
      type: String,
      required: true,
      default: 'Ash Academy',
      trim: true,
    },
    academyLogo: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      required: true,
      default: '4th Floor, Innovation Tower, Residency Road, Bengaluru - 560025',
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      default: '+91 80 4567 8900',
      trim: true,
    },
    email: {
      type: String,
      required: true,
      default: '',
      trim: true,
    },
    website: {
      type: String,
      default: '',
      trim: true,
    },
    receiptPrefix: {
      type: String,
      required: true,
      default: 'e',
      trim: true,
    },
    receiptFooterMessage: {
      type: String,
      required: true,
      default: 'Please note: All payments are final and non-refundable.',
      trim: true,
    },
    currencySymbol: {
      type: String,
      default: '₹',
      trim: true,
    },
    selectedBranch: {
      type: String,
      default: 'Tirur',
      trim: true,
    },
    branches: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const SettingsModel = mongoose.model<ISettingsDocument>('Settings', SettingsSchema);

