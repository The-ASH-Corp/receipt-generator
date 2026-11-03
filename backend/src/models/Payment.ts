import mongoose, { Document, Schema } from 'mongoose';
import { PaymentStatusType } from './Student';

export type PaymentMethodType = 'Cash' | 'Bank' | 'Bank Transfer' | 'UPI' | 'Card' | 'Other' | string;

export interface IPayment {
  _id: string;
  receiptNumber: string;
  student: string; // Student _id
  studentId: string; // Unique Student Code e.g. STU-2026-0001
  studentName: string;
  studentEmail?: string;
  studentPhone: string;
  courseName: string;
  amount: number;
  totalCourseFeeSnapshot: number;
  previousAmountPaid: number;
  totalAmountPaidAfter: number;
  remainingBalanceAfter: number;
  paymentStatusAfter: PaymentStatusType;
  paymentDate: string | Date;
  paymentMethod: PaymentMethodType;
  transactionReference?: string;
  remarks?: string;
  allowAdvance?: boolean;
  branch?: string;
  createdAt?: string | Date;
}

export interface IPaymentDocument extends Omit<IPayment, '_id'>, Document {}

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      immutable: true,
    },
    student: {
      type: String,
      required: true,
      index: true,
      immutable: true,
    },
    studentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      immutable: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
    },
    studentEmail: {
      type: String,
      default: '',
      trim: true,
      immutable: true,
    },
    studentPhone: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be greater than zero'],
      immutable: true,
    },
    totalCourseFeeSnapshot: {
      type: Number,
      required: true,
      immutable: true,
    },
    previousAmountPaid: {
      type: Number,
      required: true,
      immutable: true,
    },
    totalAmountPaidAfter: {
      type: Number,
      required: true,
      immutable: true,
    },
    remainingBalanceAfter: {
      type: Number,
      required: true,
      immutable: true,
    },
    paymentStatusAfter: {
      type: String,
      enum: ['Paid', 'Partially Paid', 'Pending'],
      required: true,
      immutable: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
      immutable: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Other'],
      required: [true, 'Payment method is required'],
      immutable: true,
    },
    transactionReference: {
      type: String,
      trim: true,
      default: '',
      immutable: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
      immutable: true,
    },
    allowAdvance: {
      type: Boolean,
      default: false,
      immutable: true,
    },
    branch: {
      type: String,
      default: 'Calicut',
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const PaymentModel = mongoose.model<IPaymentDocument>('Payment', PaymentSchema);

