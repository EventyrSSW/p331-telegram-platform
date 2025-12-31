// server/src/services/telegramBotService.ts
import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { logger } from '../utils/logger';

class TelegramBotService {
  private bot: TelegramBot | null = null;
  private initialized = false;

  /**
   * Lazy initialization - only create bot instance when first needed
   */
  private getBot(): TelegramBot | null {
    if (this.initialized) {
      return this.bot;
    }

    this.initialized = true;

    const botToken = config.telegram.botToken;
    if (!botToken) {
      logger.warn('Telegram bot token not configured - notifications disabled');
      return null;
    }

    try {
      // polling: false - we only send messages, don't receive
      this.bot = new TelegramBot(botToken, { polling: false });
      logger.info('Telegram bot service initialized');
      return this.bot;
    } catch (error) {
      logger.error('Failed to initialize Telegram bot', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Send payment confirmation notification to user
   */
  async sendPaymentNotification(
    telegramId: number,
    tonAmount: string
  ): Promise<{ success: boolean; error?: string }> {
    const bot = this.getBot();
    if (!bot) {
      return { success: false, error: 'Bot not configured' };
    }

    const message = `✅ Payment Confirmed!\n\nYour payment of ${tonAmount} TON has been verified and processed.`;

    return this.sendMessage(telegramId, message);
  }

  /**
   * Send a message to a user by their Telegram ID
   */
  async sendMessage(
    telegramId: number,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    const bot = this.getBot();
    if (!bot) {
      return { success: false, error: 'Bot not configured' };
    }

    try {
      await bot.sendMessage(telegramId, message);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Handle specific Telegram API errors
      if (errorMessage.includes('bot was blocked by the user')) {
        return { success: false, error: 'User blocked bot' };
      }
      if (errorMessage.includes('user is deactivated')) {
        return { success: false, error: 'User deactivated' };
      }
      if (errorMessage.includes('chat not found')) {
        return { success: false, error: 'User never started bot' };
      }
      if (errorMessage.includes('Too Many Requests')) {
        return { success: false, error: 'Rate limited' };
      }

      return { success: false, error: errorMessage };
    }
  }
}

export const telegramBotService = new TelegramBotService();
