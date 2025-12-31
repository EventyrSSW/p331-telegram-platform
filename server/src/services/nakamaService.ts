import { Client, Session } from '@heroiclabs/nakama-js';
import { config } from '../config';
import { logger } from '../utils/logger';

interface WalletUpdateResult {
  success: boolean;
  userId?: string;
  addedAmount?: number;
  newBalance?: number;
  tonTxHash?: string;
  alreadyProcessed?: boolean;
  error?: string;
  code?: string;
}

export class NakamaService {
  private client: Client;
  private serverSession: Session | null = null;

  constructor() {
    this.client = new Client(
      config.nakama.serverKey,
      config.nakama.host,
      config.nakama.port.toString(),
      config.nakama.useSSL
    );
  }

  /**
   * Authenticate as server (using device auth with a fixed server ID)
   */
  private async ensureServerSession(): Promise<Session> {
    if (this.serverSession && !this.serverSession.isexpired) {
      return this.serverSession;
    }

    // Use device auth with a fixed server ID for server-to-server calls
    this.serverSession = await this.client.authenticateDevice(
      'server-backend-' + config.nakama.serverKey,
      true,  // create if not exists
      'server'
    );

    logger.info('Nakama server session established');
    return this.serverSession;
  }

  /**
   * Update a user's wallet balance in Nakama
   * Called after blockchain verification succeeds
   */
  async updateUserWallet(params: {
    userId: string;      // Nakama user ID
    amount: number;       // Amount to add (in cents)
    tonTxHash: string;    // Transaction hash for idempotency
    tonAmount: string;    // TON amount in nanoTON
    reason?: string;
  }): Promise<WalletUpdateResult> {
    try {
      const session = await this.ensureServerSession();

      const payload = {
        userId: params.userId,
        amount: params.amount,
        tonTxHash: params.tonTxHash,
        tonAmount: params.tonAmount,
        reason: params.reason || 'ton_purchase',
      };

      logger.info('Calling Nakama updateUserWallet RPC', { userId: params.userId, amount: params.amount });

      const response = await this.client.rpc(
        session,
        'update_user_wallet',
        payload
      );

      return response.payload as WalletUpdateResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Nakama updateUserWallet failed', { error: message, userId: params.userId });
      return {
        success: false,
        error: message,
        code: 'NAKAMA_RPC_ERROR',
      };
    }
  }

  /**
   * Map Telegram ID to Nakama user ID
   * Users authenticate with Telegram custom ID format: telegram_${telegramId}
   * (matches frontend src/services/nakama.ts authenticateWithTelegram)
   *
   * Note: We use authenticateCustom with create=false to look up existing users.
   * getUsers() doesn't support lookup by custom ID.
   */
  async getNakamaUserIdFromTelegramId(telegramId: number): Promise<string | null> {
    // Nakama custom ID format for Telegram users (uses underscore, not colon)
    const customId = `telegram_${telegramId}`;

    logger.info('Looking up Nakama user by custom ID', { telegramId, customId });

    try {
      // Use authenticateCustom with create=false to look up existing user
      // This will fail if user doesn't exist, which is what we want
      const session = await this.client.authenticateCustom(
        customId,
        false,  // create = false - don't create if not exists
        undefined  // username not needed for lookup
      );

      if (session && session.user_id) {
        logger.info('Found Nakama user', { nakamaUserId: session.user_id, customId });
        return session.user_id;
      }

      logger.warn('No Nakama user found for Telegram ID', { telegramId, customId });
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      // "User account not found" is expected when user hasn't connected to Nakama yet
      if (message.includes('not found') || message.includes('Not found')) {
        logger.warn('Nakama user not found for Telegram ID', { telegramId, customId });
      } else {
        logger.error('Failed to get Nakama user ID', { error: message, telegramId, customId });
      }
      return null;
    }
  }
}

export const nakamaService = new NakamaService();
