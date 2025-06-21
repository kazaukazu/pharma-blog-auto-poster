import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { generalRateLimit } from './middleware/rateLimiter';
import { 
  sanitizeInput,
  validateSqlParams,
  setSecurityHeaders,
  securityLogger,
  createAdaptiveRateLimit,
  createSlowDown
} from './middleware/security';
import logger from './utils/logger';
import { SchedulerService } from './services/schedulerService';

// Import routes
import authRoutes from './routes/auth';
import siteRoutes from './routes/sites';
import postRoutes from './routes/posts';
import claudeRoutes from './routes/claude';
import scheduleRoutes from './routes/schedules';
import analyticsRoutes from './routes/analytics';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // We'll handle CSP manually
}));
app.use(setSecurityHeaders);
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Security logging
app.use(securityLogger);

// Input sanitization and validation
app.use(sanitizeInput);
app.use(validateSqlParams);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Adaptive rate limiting and slow down
app.use(createSlowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Slow down after 50 requests
  delayMs: 100 // Delay each request by 100ms
}));

app.use(createAdaptiveRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'PharmaBlog Auto Poster API is running',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api', postRoutes);
app.use('/api/claude', claudeRoutes);
app.use('/api', scheduleRoutes);
app.use('/api', analyticsRoutes);

// Catch-all for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
  
  // Initialize scheduler
  SchedulerService.init();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  SchedulerService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  SchedulerService.stop();
  process.exit(0);
});

export default app;