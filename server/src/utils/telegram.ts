import crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramInitData {
  user: TelegramUser;
  auth_date: number;
  hash: string;
  query_id?: string;
}

export function verifyTelegramWebAppData(initData: string, botToken: string): TelegramInitData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) {
      return null;
    }

    // Remove hash from params for verification
    urlParams.delete('hash');

    // Sort params alphabetically and create data-check-string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key from bot token
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate expected hash
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (hash !== expectedHash) {
      console.warn('Telegram auth: hash mismatch - check TELEGRAM_BOT_TOKEN');
      return null;
    }

    // Verify auth_date is not too old (max 1 hour)
    const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 3600) {
      console.warn(`Telegram auth: expired - auth_date ${authDate}, now ${now}, diff ${now - authDate}s`);
      return null;
    }

    // Parse user data
    const userString = urlParams.get('user');
    if (!userString) {
      return null;
    }

    const user = JSON.parse(userString) as TelegramUser;

    return {
      user,
      auth_date: authDate,
      hash,
      query_id: urlParams.get('query_id') || undefined,
    };
  } catch {
    return null;
  }
}
