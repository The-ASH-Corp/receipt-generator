import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import studentRoutes from './routes/studentRoutes';
import paymentRoutes from './routes/paymentRoutes';
import settingsRoutes from './routes/settingsRoutes';
import courseRoutes from './routes/courseRoutes';
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
    storageEngine: 'MongoDB (Mongoose)',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/courses', courseRoutes);

// Error Middleware
app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  const connected = await connectDB();
  if (!connected) {
    throw new Error('MongoDB is required; the backend will not start without a database connection.');
  }

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
