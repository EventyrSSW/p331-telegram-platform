import { Client, Session } from '@heroiclabs/nakama-js';
import { nakamaConfig } from '../config/nakama';

const SESSION_KEY = 'nakama_session';

interface TelegramUserData {
  telegramId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  languageCode?: string | null;
  isPremium?: boolean;
}

class NakamaService {
  private client: Client;
  private session: Session | null = null;

  constructor() {
    this.client = new Client(
      nakamaConfig.serverKey,
      nakamaConfig.host,
      nakamaConfig.port.toString(),
      nakamaConfig.useSSL
    );

    // Try to restore session from storage
    this.restoreSession();
  }

  private restoreSession(): void {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        this.session = Session.restore(parsed.token, parsed.refresh_token);

        // Check if session is expired
        if (this.session.isexpired(Date.now() / 1000)) {
          console.log('[Nakama] Stored session expired');
          this.session = null;
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (error) {
      console.error('[Nakama] Failed to restore session:', error);
      localStorage.removeItem(SESSION_KEY);
    }
  }

  private saveSession(session: Session): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      token: session.token,
      refresh_token: session.refresh_token,
    }));
  }

  async authenticateWithTelegram(userData: TelegramUserData): Promise<Session> {
    const customId = `telegram_${userData.telegramId}`;
    const username = userData.username || `user_${userData.telegramId}`;

    console.log('[Nakama] Authenticating with Telegram ID:', userData.telegramId);

    try {
      // Authenticate with custom ID (Telegram ID)
      this.session = await this.client.authenticateCustom(
        customId,
        true, // create if doesn't exist
        username
      );

      console.log('[Nakama] Authenticated, user ID:', this.session.user_id);
      this.saveSession(this.session);

      // Update account with Telegram profile data
      await this.updateAccountFromTelegram(userData);

      return this.session;
    } catch (error) {
      console.error('[Nakama] Authentication failed:', error);
      throw error;
    }
  }

  private async updateAccountFromTelegram(userData: TelegramUserData): Promise<void> {
    if (!this.session) return;

    const displayName = [userData.firstName, userData.lastName]
      .filter(Boolean)
      .join(' ') || userData.username || `User ${userData.telegramId}`;

    try {
      await this.client.updateAccount(this.session, {
        display_name: displayName,
        avatar_url: userData.photoUrl || undefined,
        lang_tag: userData.languageCode || undefined,
      });
      console.log('[Nakama] Account updated with Telegram data');
    } catch (error) {
      console.error('[Nakama] Failed to update account:', error);
      // Don't throw - account update is not critical
    }
  }

  async getAccount() {
    if (!this.session) {
      throw new Error('Not authenticated');
    }
    return this.client.getAccount(this.session);
  }

  async refreshSession(): Promise<Session | null> {
    if (!this.session) return null;

    try {
      this.session = await this.client.sessionRefresh(this.session);
      this.saveSession(this.session);
      return this.session;
    } catch (error) {
      console.error('[Nakama] Session refresh failed:', error);
      this.session = null;
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  getSession(): Session | null {
    return this.session;
  }

  getClient(): Client {
    return this.client;
  }

  isAuthenticated(): boolean {
    return this.session !== null && !this.session.isexpired(Date.now() / 1000);
  }

  logout(): void {
    if (this.session) {
      this.client.sessionLogout(
        this.session,
        this.session.token,
        this.session.refresh_token
      ).catch(console.error);
    }
    this.session = null;
    localStorage.removeItem(SESSION_KEY);
  }
}

export const nakamaService = new NakamaService();
export type { TelegramUserData };
