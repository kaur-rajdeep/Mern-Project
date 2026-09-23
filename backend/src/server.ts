import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import helmet from 'helmet';
import routes from './routes';
import { AUTH_CONFIG } from './config/auth';
import { apiLimiter } from './middleware/rateLimiter';
import { mongoSanitize } from './middleware/mongoSanitize';

dotenv.config();

// Ensure reliable DNS resolution for MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) { }

const app = express();
app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/panaceainfosec';

// Strict CORS origin handling for production & multi-domain deployments
const defaultDevOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://pcm.radpretation.ai/',
];
const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : [];
const allowedOrigins = Array.from(new Set([...defaultDevOrigins, ...envOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: Origin '${origin}' is not authorized.`), false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize);

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

// API Routes with Rate Limiting
app.use('/api', apiLimiter);
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
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Panacea Backend Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
