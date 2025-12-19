import rateLimit from 'express-rate-limit';

// General API rate limit
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit for coin operations
export const coinOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 coin operations per minute
  message: { error: 'Too many coin operations, please wait' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict limit for purchases
export const purchaseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 purchases per hour
  message: { error: 'Purchase limit reached, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
