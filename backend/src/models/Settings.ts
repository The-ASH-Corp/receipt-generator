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
  updatedAt?: string | Date;
}

export interface ISettingsDocument extends Omit<ISettings, '_id'>, Document {}

const SettingsSchema = new Schema<ISettingsDocument>(
  {
    academyName: {
      type: String,
      required: true,
      default: 'Apex Global Academy of Technology',
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
      default: 'admissions@apexacademy.edu',
      trim: true,
    },
    website: {
      type: String,
      default: 'www.apexacademy.edu',
      trim: true,
    },
    receiptPrefix: {
      type: String,
      required: true,
      default: 'REC',
      trim: true,
      uppercase: true,
    },
    receiptFooterMessage: {
      type: String,
      required: true,
      default: 'Thank you for your payment! Looking forward to empowering your learning journey.',
      trim: true,
    },
    currencySymbol: {
      type: String,
      default: '₹',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const SettingsModel = mongoose.model<ISettingsDocument>('Settings', SettingsSchema);

