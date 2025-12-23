export const nakamaConfig = {
  serverKey: 'defaultkey',
  host: import.meta.env.VITE_NAKAMA_HOST || 'nakama-server.eventyr.cloud',
  port: import.meta.env.VITE_NAKAMA_PORT ? parseInt(import.meta.env.VITE_NAKAMA_PORT) : 443,
  useSSL: import.meta.env.VITE_NAKAMA_USE_SSL !== 'false',
};
