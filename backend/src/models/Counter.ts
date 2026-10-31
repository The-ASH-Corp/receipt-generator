import mongoose, { Document, Schema } from 'mongoose';

export interface ICounterDocument extends Document {
  key: string;
  seq: number;
}

const CounterSchema = new Schema<ICounterDocument>({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

export const CounterModel = mongoose.model<ICounterDocument>('Counter', CounterSchema);

