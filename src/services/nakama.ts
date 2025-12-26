import { Client, Session, Socket, MatchData, Notification, MatchPresenceEvent } from '@heroiclabs/nakama-js';
import { nakamaConfig } from '../config/nakama';

const SESSION_KEY = 'nakama_session';

// Op code constants for match communication
export const MatchOpCodes = {
  MATCH_READY: 1,
  SCORE_SUBMIT: 2,
  MATCH_RESULT: 3,
  PLAYER_UPDATE: 4,
} as const;

interface MatchState {
  matchId: string;
  gameId: string;
  betAmount: number;
  level: MatchLevel | null;
  status: 'waiting' | 'ready' | 'playing' | 'completed';
  matchType: 'PVP' | 'PVH';
  players: { [userId: string]: PlayerInfo };
  results: { [userId: string]: PlayerResult };
  payout?: number;
  winner?: string;
}

interface MatchLevel {
  id: number;
  name: string;
  tier: string;
  tiles: unknown[];
  totalPairs: number;
  timeBonus: number;
}

interface PlayerInfo {
  odredacted: string;
  username: string;
  isHouse: boolean;
}

interface PlayerResult {
  score: number;
  timeMs: number;
}

interface JoinGameResponse {
  matchId?: string;
  action?: string;
  error?: string;
  code?: string;
}

interface MatchCallbacks {
  onMatchReady?: (data: MatchState) => void;
  onMatchResult?: (data: MatchState) => void;
  onOpponentScore?: (userId: string, score: number) => void;
  onError?: (error: string) => void;
  onPresenceChange?: (presences: MatchPresence) => void;
}

interface PresenceInfo {
  userId: string;
  username: string;
  avatarUrl?: string;
  isOnline: boolean;
}

interface MatchPresence {
  [userId: string]: PresenceInfo;
}

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
  private socket: Socket | null = null;
  private currentMatch: MatchState | null = null;
  private matchCallbacks: MatchCallbacks = {};
  private matchPresences: MatchPresence = {};
  private isSocketConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
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

  // Socket connection methods
  async connectSocket(): Promise<Socket> {
    if (!this.session) {
      throw new Error('Not authenticated');
    }

    if (this.session.isexpired(Date.now() / 1000)) {
      throw new Error('Session expired, please re-authenticate');
    }

    if (this.socket) {
      return this.socket;
    }

    if (this.isSocketConnecting) {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const maxWaitTime = 10000; // 10 seconds
        const checkInterval = setInterval(() => {
          if (this.socket) {
            clearInterval(checkInterval);
            resolve(this.socket);
          } else if (!this.isSocketConnecting) {
            clearInterval(checkInterval);
            reject(new Error('Socket connection failed'));
          } else if (Date.now() - startTime > maxWaitTime) {
            clearInterval(checkInterval);
            reject(new Error('Socket connection timeout'));
          }
        }, 100);
      });
    }

    this.isSocketConnecting = true;

    try {
      this.socket = this.client.createSocket(nakamaConfig.useSSL, false);
      await this.socket.connect(this.session, true);

      this.socket.onmatchdata = this.handleMatchData.bind(this);
      this.socket.onnotification = this.handleNotification.bind(this);
      this.socket.onmatchpresence = this.handleMatchPresence.bind(this);
      this.socket.ondisconnect = (evt) => {
        console.log('[Nakama] Socket disconnected', evt);
        this.socket = null;
        this.attemptReconnect();
      };

      console.log('[Nakama] Socket connected');
      this.reconnectAttempts = 0;
      return this.socket;
    } finally {
      this.isSocketConnecting = false;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Nakama] Max reconnection attempts reached');
      this.matchCallbacks.onError?.('Connection lost. Please refresh to reconnect.');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`[Nakama] Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimeoutId = setTimeout(async () => {
      this.reconnectAttempts++;
      try {
        await this.connectSocket();
        if (this.currentMatch?.matchId && this.socket) {
          console.log('[Nakama] Rejoining match after reconnect:', this.currentMatch.matchId);
          await this.socket.joinMatch(this.currentMatch.matchId);
        }
      } catch (error) {
        console.error('[Nakama] Reconnection failed:', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  private handleMatchPresence(presenceEvent: MatchPresenceEvent): void {
    console.log('[Nakama] Match presence:', presenceEvent);

    presenceEvent.joins?.forEach(p => {
      console.log('[Nakama] Player joined:', p.username);
      this.matchPresences[p.user_id] = {
        userId: p.user_id,
        username: p.username,
        avatarUrl: undefined,
        isOnline: true,
      };
    });

    presenceEvent.leaves?.forEach(p => {
      console.log('[Nakama] Player left:', p.username);
      if (this.matchPresences[p.user_id]) {
        this.matchPresences[p.user_id].isOnline = false;
      }
      this.matchCallbacks.onError?.(`${p.username} disconnected`);
    });

    this.matchCallbacks.onPresenceChange?.({ ...this.matchPresences });
  }

  private handleMatchData(matchData: MatchData): void {
    const data = JSON.parse(new TextDecoder().decode(matchData.data));
    console.log('[Nakama] Match data received:', matchData.op_code, data);

    switch (matchData.op_code) {
      case MatchOpCodes.MATCH_READY:
        this.currentMatch = {
          matchId: matchData.match_id,
          gameId: data.game?.id || '',
          betAmount: data.betAmount,
          level: data.game?.level || null,
          status: 'ready',
          matchType: data.matchType,
          players: {},
          results: {},
        };
        this.matchCallbacks.onMatchReady?.(this.currentMatch);
        break;
      case MatchOpCodes.MATCH_RESULT:
        if (this.currentMatch) {
          this.currentMatch.status = 'completed';
          this.currentMatch.results = data.results || {};
          this.currentMatch.winner = data.winner;
          this.currentMatch.payout = data.payout;
          this.matchCallbacks.onMatchResult?.(this.currentMatch);
        }
        break;
    }
  }

  private handleNotification(notification: Notification): void {
    console.log('[Nakama] Notification:', notification.code, notification.content);
    // Handle win/lose notifications (codes 100, 101, 102)
  }

  // Match methods
  async joinGame(gameId: string, betAmount: number): Promise<JoinGameResponse> {
    if (!this.session) {
      throw new Error('Not authenticated');
    }

    const response = await this.client.rpc(
      this.session,
      'join_game',
      { gameId, betAmount }
    );

    // Parse payload if it's a string (Nakama returns JSON string)
    let result: JoinGameResponse;
    if (typeof response.payload === 'string') {
      result = JSON.parse(response.payload);
    } else {
      result = response.payload as JoinGameResponse;
    }

    if (result.error) {
      // Include error code for more specific handling
      const errorMessage = result.code
        ? `${result.error} (${result.code})`
        : result.error;
      throw new Error(errorMessage);
    }

    // Join the match via socket
    if (result.matchId) {
      if (this.socket) {
        try {
          console.log('[Nakama] Joining match via socket:', result.matchId);
          const match = await this.socket.joinMatch(result.matchId);
          console.log('[Nakama] Joined match:', result.matchId, 'presences:', match.presences);

          // Process initial presences from joinMatch response
          if (match.presences && match.presences.length > 0) {
            match.presences.forEach(p => {
              this.matchPresences[p.user_id] = {
                userId: p.user_id,
                username: p.username,
                avatarUrl: undefined,
                isOnline: true,
              };
            });
            console.log('[Nakama] Populated initial presences:', this.matchPresences);
            // Notify context about initial presences
            this.matchCallbacks.onPresenceChange?.({ ...this.matchPresences });
          }
        } catch (e) {
          console.error('[Nakama] Failed to join match via socket:', e);
          // Don't throw - RPC succeeded, socket join is secondary
        }
      } else {
        console.warn('[Nakama] Socket not connected, cannot join match');
      }
    } else {
      console.warn('[Nakama] No matchId in response:', result);
    }

    console.log('[Nakama] joinGame returning result:', result);
    return result;
  }

  async submitScore(matchId: string, score: number, timeMs: number): Promise<void> {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    const data = JSON.stringify({ score, timeMs });
    await this.socket.sendMatchState(matchId, MatchOpCodes.SCORE_SUBMIT, data);
    console.log('[Nakama] Submitted score:', score);
  }

  async leaveMatch(matchId: string): Promise<void> {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    if (this.socket && matchId) {
      try {
        await this.socket.leaveMatch(matchId);
        console.log('[Nakama] Left match:', matchId);
      } catch (e) {
        console.warn('[Nakama] Error leaving match:', e);
      }
    }
    this.currentMatch = null;
    this.matchPresences = {};
  }

  setMatchCallbacks(callbacks: MatchCallbacks): void {
    this.matchCallbacks = callbacks;
  }

  getCurrentMatch(): MatchState | null {
    return this.currentMatch;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getMatchPresences(): MatchPresence {
    return { ...this.matchPresences };
  }

  isSocketConnectingState(): boolean {
    return this.isSocketConnecting;
  }

  clearMatchPresences(): void {
    this.matchPresences = {};
  }

  // Wallet methods
  async getWallet(): Promise<{ coins: number }> {
    if (!this.session) {
      throw new Error('Not authenticated');
    }

    const account = await this.client.getAccount(this.session);
    const wallet = account.wallet ? JSON.parse(account.wallet) : { coins: 0 };
    return wallet;
  }

  async addTestCoins(amount: number = 1000): Promise<void> {
    if (!this.session) {
      throw new Error('Not authenticated');
    }

    await this.client.rpc(this.session, 'add_test_coins', { amount });
    console.log('[Nakama] Added', amount, 'test coins');
  }
}

export const nakamaService = new NakamaService();
export type { TelegramUserData, MatchState, MatchLevel, MatchCallbacks, PresenceInfo, MatchPresence };
