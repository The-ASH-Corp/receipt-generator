import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, isMongoConnected } from './config/db';
import { initializeSeedData } from './services/dataStore';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import studentRoutes from './routes/studentRoutes';
import paymentRoutes from './routes/paymentRoutes';
import settingsRoutes from './routes/settingsRoutes';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    storageEngine: isMongoConnected() ? 'MongoDB (Mongoose)' : 'Persistent Local Ledger',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);

// Error Middleware
app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  await connectDB();
  await initializeSeedData();

  app.listen(PORT, () => {
    console.log(`=========================================================`);
    console.log(` Student Fee Manager Backend API running on port ${PORT}`);
    console.log(` Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=========================================================`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start backend server:', err);
  process.exit(1);
});

