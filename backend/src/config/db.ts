import mongoose from 'mongoose';

let mongoConnected = false;

export const isMongoConnected = (): boolean => mongoConnected;

export const connectDB = async (): Promise<boolean> => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student-fee-manager';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    mongoConnected = true;
    console.log(`[Database] Connected to MongoDB at ${uri}`);
    return true;
  } catch (err) {
    mongoConnected = false;
    console.warn(
      '[Database] Could not connect to MongoDB. MongoDB is required; start a local mongod service or set MONGODB_URI in backend/.env.'
    );
    return false;
  }
};
