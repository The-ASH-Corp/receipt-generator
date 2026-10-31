import mongoose, { Document, Schema } from 'mongoose';

export interface IAdmin {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
}

export interface IAdminDocument extends Omit<IAdmin, '_id'>, Document {}

const AdminSchema = new Schema<IAdminDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const AdminModel = mongoose.model<IAdminDocument>('Admin', AdminSchema);
