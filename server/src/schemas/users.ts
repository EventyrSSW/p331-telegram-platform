import { z } from 'zod';

export const walletAddressSchema = z.string()
  .min(48, 'Invalid wallet address')
  .max(67, 'Invalid wallet address')
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid wallet address format');

export const coinAmountSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .int('Amount must be a whole number')
    .max(1_000_000, 'Amount too large'),
});

export const addCoinsSchema = coinAmountSchema.extend({
  transactionHash: z.string().optional(), // For future blockchain verification
});
