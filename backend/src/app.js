import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import pgRoutes from './routes/pgs.js';
import adminRoutes from './routes/admin.js';
import enquiryRoutes from './routes/enquiries.js';
import profileRoutes from './routes/profile.js';
import notificationRoutes from './routes/notifications.js';
import reportRoutes from './routes/reports.js';

const app = express();
const clientOrigins = new Set((process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174')
  .split(',').map((origin) => origin.trim()).filter(Boolean));

app.use(helmet());
app.use(cors({ origin: (origin, callback) => callback(null, !origin || clientOrigins.has(origin)) }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});
app.use('/api', (request, response, next) => {
  if (request.path !== '/health' && mongoose.connection.readyState !== 1) {
    return response.status(503).json({ message: 'Database unavailable. Start MongoDB and try again.' });
  }
  return next();
});
app.use('/api/auth', authRoutes);
app.use('/api/pgs', pgRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

app.use((_request, response) => response.status(404).json({ message: 'Route not found' }));
app.use((error, _request, response, _next) => {
  console.error(error);
  const status = error.status || (error.name === 'ValidationError' ? 400 : error.code === 11000 ? 409 : 500);
  response.status(status).json({ message: status === 500 ? 'Something went wrong' : error.message });
});

export default app;