import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env first (defaults)
dotenv.config();

// Load .env.local if it exists (local overrides)
const localEnvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: '7d',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },

  ton: {
    paymentReceiverAddress: process.env.PAYMENT_RECEIVER_ADDRESS || '',
    apiEndpoint: process.env.TON_API_ENDPOINT || 'https://toncenter.com/api/v2/jsonRPC',
    apiKey: process.env.TON_API_KEY || '',
    minConfirmations: parseInt(process.env.TON_MIN_CONFIRMATIONS || '1', 10),
    verificationTimeoutMs: parseInt(process.env.TON_VERIFICATION_TIMEOUT_MS || '30000', 10),
  },

  // Debug mode - allows authentication without Telegram verification
  allowWebDebug: process.env.ALLOW_WEB_DEBUG === 'true',

  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .filter(Boolean)
      .concat([
        'http://localhost:5173',
        'http://localhost:3000',
        'https://p331-tg-platform.vercel.app',
        'https://p331-telegram-platform.vercel.app',
        'https://telegram-platform.eventyr.cloud',
      ]),
  },
} as const;

// Validate required config in production
if (config.isProduction) {
  const required = ['JWT_SECRET', 'TELEGRAM_BOT_TOKEN', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
