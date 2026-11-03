import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse {
  _id: string;
  name: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ICourseDocument extends Omit<ICourse, '_id'>, Document {}

const CourseSchema = new Schema<ICourseDocument>(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const CourseModel = mongoose.model<ICourseDocument>('Course', CourseSchema);

