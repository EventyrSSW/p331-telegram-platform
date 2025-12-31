import { z } from 'zod';

export const walletAddressSchema = z.string()
  .min(48, 'Invalid wallet address')
  .max(67, 'Invalid wallet address')
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid wallet address format');

export const coinAmountSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .max(1_000_000, 'Amount too large')
    .refine(val => {
      // Allow up to 3 decimal places (milliCoins precision)
      // Check if val * 1000 produces an integer (no fractional remainder)
      return val * 1000 === Math.floor(val * 1000);
    }, 'Maximum 3 decimal places allowed'),
});

// REMOVED: addCoinsSchema, addCoinsVerifiedSchema - use invoice flow instead

export const linkWalletSchema = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
});

export const getUserStatsSchema = z.object({
  // No body/query params needed - uses authenticated user ID
});
