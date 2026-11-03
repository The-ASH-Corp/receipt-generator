import mongoose, { Document, Schema } from 'mongoose';

export type PaymentStatusType = 'Paid' | 'Partially Paid' | 'Pending';
export type StudentStatusType = 'Active' | 'Inactive';
export type ClassModeType = 'Offline' | 'Online' | 'Hybrid';
export type BranchType = 'Calicut' | 'Thirur' | string;

export interface IStudent {
  _id: string;
  studentId: string;
  fullName: string;
  email?: string;
  phone: string;
  courseName: string;
  courseDuration: string;
  classMode?: ClassModeType;
  branch?: BranchType;
  paymentMethod?: string;
  courseStartDate?: string | Date;
  totalCourseFee: number;
  totalAmountPaid: number;
  remainingBalance: number;
  paymentStatus: PaymentStatusType;
  registrationDate: string | Date;
  status: StudentStatusType;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IStudentDocument extends Omit<IStudent, '_id'>, Document {}

const StudentSchema = new Schema<IStudentDocument>(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'WhatsApp phone number is required'],
      trim: true,
    },
    courseName: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
    },
    courseDuration: {
      type: String,
      required: [true, 'Course duration is required'],
      trim: true,
    },
    classMode: {
      type: String,
      enum: ['Offline', 'Online', 'Hybrid'],
      default: 'Offline',
    },
    branch: {
      type: String,
      default: 'Calicut',
    },
    paymentMethod: {
      type: String,
      default: '',
    },
    courseStartDate: {
      type: Date,
      default: Date.now,
    },
    totalCourseFee: {
      type: Number,
      required: [true, 'Total course fee is required'],
      min: [0, 'Total course fee cannot be negative'],
    },
    totalAmountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Partially Paid', 'Pending'],
      default: 'Pending',
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

export const StudentModel = mongoose.model<IStudentDocument>('Student', StudentSchema);

