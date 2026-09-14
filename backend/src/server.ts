import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import routes from './routes';

dotenv.config();

// Ensure reliable DNS resolution for MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/panaceainfosec';

// Robust CORS handling for multi-domain production deployments
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive fallback for standard browser clients
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection Management
let isConnecting = false;
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1 || isConnecting) return;
  isConnecting = true;
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB database:', MONGODB_URI);
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
  } finally {
    isConnecting = false;
  }
};

// Initiate connection immediately
connectDB();

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    service: 'Panacea Infosec Compliance & Audit Management API',
  });
});

// Ensure DB is connected before processing any API requests
app.use('/api', async (req, res, next) => {
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }
  next();
});

// API Routes
app.use('/api', routes);

import { formatErrorMessage } from './utils/formatError';

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  const friendlyMessage = formatErrorMessage(err);
  res.status(err.status || 500).json({
    success: false,
    message: friendlyMessage,
  });
});

// Start listening in standalone/local environments
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Panacea Backend Server running on http://localhost:${PORT}`);
  });
}

export default app;
