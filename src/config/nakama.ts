export const nakamaConfig = {
  serverKey: 'defaultkey',
  host: import.meta.env.VITE_NAKAMA_HOST || '136.243.136.206',
  port: import.meta.env.VITE_NAKAMA_PORT ? parseInt(import.meta.env.VITE_NAKAMA_PORT) : 7350,
  useSSL: import.meta.env.VITE_NAKAMA_USE_SSL !== 'false', // Default to true (HTTPS)
};
