import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import routes from './routes';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimit';
import { startProcessUnverifiedInvoicesJob } from './jobs/processUnverifiedInvoices';

const app = express();

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.cors.allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (origin.includes('.ngrok')) return callback(null, true);

    logger.warn('CORS blocked origin', { origin });
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
}));

// Middleware
app.use(express.json());
app.use(requestLogger);
app.use(generalLimiter);

// Routes
app.use('/api', routes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  logger.info('Server started', {
    port: config.port,
    env: config.nodeEnv,
  });

  // Start background jobs
  startProcessUnverifiedInvoicesJob();
});
