import { z } from 'zod';

export const telegramAuthSchema = z.object({
  initData: z.string().min(1, 'initData is required'),
});

export const debugAuthSchema = z.object({
  telegramId: z.number().int().positive('telegramId must be a positive integer'),
  username: z.string().min(1, 'username is required'),
});

export type TelegramAuthInput = z.infer<typeof telegramAuthSchema>;
export type DebugAuthInput = z.infer<typeof debugAuthSchema>;
