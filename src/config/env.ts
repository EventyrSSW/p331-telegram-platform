export const env = {
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  appUrl: import.meta.env.VITE_APP_URL || window.location.origin,
  paymentReceiverAddress: import.meta.env.VITE_PAYMENT_RECEIVER_ADDRESS || '',
} as const;

// Validate required vars in production
if (import.meta.env.PROD && !import.meta.env.VITE_PAYMENT_RECEIVER_ADDRESS) {
  throw new Error('CRITICAL: Missing VITE_PAYMENT_RECEIVER_ADDRESS in production build');
}
