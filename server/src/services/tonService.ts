import TonWeb from 'tonweb';
import { config } from '../config';
import { logger } from '../utils/logger';

// Transaction type from TonWeb API
interface TonTransaction {
  transaction_id: {
    lt: string;
    hash: string;
  };
  utime: number;
  fee: string;
  in_msg?: {
    source: string;
    destination: string;
    value: string;
    message?: string;
    msg_data?: {
      '@type': string;
      body?: string;  // Base64-encoded message body
      text?: string;  // Sometimes text is here
    };
  };
  out_msgs: Array<{
    source: string;
    destination: string;
    value: string;
    message?: string;
  }>;
}

/**
 * Decode comment from TON message
 * TonCenter returns comment in different fields depending on the message type:
 * - msg_data.body: Base64-encoded body (may not exist)
 * - msg_data.text: Plain text (rare)
 * - message: Sometimes Base64, sometimes already decoded text
 */
function decodeComment(msg: TonTransaction['in_msg'], debug = false): string | null {
  if (!msg) return null;

  const log = debug ? (s: string, data?: object) => logger.info(`[decodeComment] ${s}`, data) : () => {};

  log('Raw message fields', {
    hasMessage: !!msg.message,
    messageValue: msg.message,
    hasMsgData: !!msg.msg_data,
    msgDataType: msg.msg_data?.['@type'],
    msgDataBody: msg.msg_data?.body,
    msgDataText: msg.msg_data?.text,
  });

  // Try msg_data.body first (Base64 encoded)
  if (msg.msg_data?.body) {
    try {
      const decoded = Buffer.from(msg.msg_data.body, 'base64').toString('utf-8');
      const printable = decoded.replace(/[\x00-\x1F\x7F]/g, '').trim();
      log('Decoded msg_data.body', { raw: msg.msg_data.body, decoded: printable });
      if (printable && printable.length > 0) return printable;
    } catch (e) {
      log('Failed to decode msg_data.body', { error: String(e) });
    }
  }

  // Try msg_data.text
  if (msg.msg_data?.text) {
    log('Using msg_data.text', { text: msg.msg_data.text });
    return msg.msg_data.text;
  }

  // Try to decode message field as Base64 (TonCenter sometimes puts Base64 here)
  if (msg.message) {
    // Check if it looks like Base64 (only alphanumeric, +, /, = and reasonable length)
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    const looksLikeBase64 = base64Regex.test(msg.message) && msg.message.length >= 4;
    log('Checking message field', { message: msg.message, looksLikeBase64 });

    if (looksLikeBase64) {
      try {
        const decoded = Buffer.from(msg.message, 'base64').toString('utf-8');
        const printable = decoded.replace(/[\x00-\x1F\x7F]/g, '').trim();
        log('Decoded message as Base64', { decoded: printable, hasGarbage: printable.includes('�') });
        if (printable && printable.length > 0 && !printable.includes('�')) {
          return printable;
        }
      } catch (e) {
        log('Failed to decode message as Base64', { error: String(e) });
      }
    }
    // Return as-is if not Base64
    log('Using message as-is', { message: msg.message });
    return msg.message;
  }

  log('No comment found');
  return null;
}

// Maximum age of transaction to consider (5 minutes)
const MAX_TX_AGE_SECONDS = 300;

// Maximum transactions to fetch (may need pagination for high-volume scenarios)
const MAX_TRANSACTIONS_TO_FETCH = 100;

export interface VerificationResult {
  verified: boolean;
  error?: string;
  transaction?: {
    hash: string;
    lt: string;
    amount: string;  // In nanoTON
    sender: string;
    timestamp: number;
  };
}

export class TonService {
  private tonweb: TonWeb;
  private receiverAddress: string;
  private minConfirmations: number;

  constructor() {
    const provider = new TonWeb.HttpProvider(config.ton.apiEndpoint, {
      apiKey: config.ton.apiKey || undefined,
    });
    this.tonweb = new TonWeb(provider);
    this.receiverAddress = config.ton.paymentReceiverAddress;
    this.minConfirmations = config.ton.minConfirmations;
  }

  /**
   * Verify a TON transaction on the blockchain
   *
   * Note: TonConnect returns a BOC (Bag of Cells), not the actual blockchain tx hash.
   * We verify by finding a recent transaction with the exact expected amount.
   * The BOC is stored for idempotency to prevent replay attacks.
   *
   * @param boc - The BOC returned by TonConnect (used for idempotency, not lookup)
   * @param expectedAmountNano - Expected amount in nanoTON
   * @returns VerificationResult with transaction details if verified
   */
  async verifyTransaction(
    boc: string,
    expectedAmountNano: bigint
  ): Promise<VerificationResult> {
    logger.info('TON verification attempt', {
      bocLength: boc.length,
      expectedAmountNano: expectedAmountNano.toString(),
      receiverAddress: this.receiverAddress,
      apiEndpoint: config.ton.apiEndpoint,
    });

    if (!this.receiverAddress) {
      logger.warn('TON verification failed: receiver address not configured');
      return {
        verified: false,
        error: 'Payment receiver address not configured',
      };
    }

    try {
      // Fetch recent transactions for our receiver address
      logger.info('Fetching transactions for receiver address', { address: this.receiverAddress });
      const transactions = await this.tonweb.getTransactions(
        this.receiverAddress,
        MAX_TRANSACTIONS_TO_FETCH
      );

      logger.info('Fetched transactions', { count: transactions?.length || 0 });

      if (!transactions || transactions.length === 0) {
        logger.warn('TON verification failed: no transactions found for receiver');
        return {
          verified: false,
          error: 'No transactions found for receiver address. Transaction may still be processing.',
        };
      }

      // Find a recent transaction with the exact expected amount
      // Since we can't match by BOC/hash directly, we match by amount and recency
      const nowSeconds = Math.floor(Date.now() / 1000);

      const matchingTx = transactions.find((t: TonTransaction) => {
        // Must have incoming message
        if (!t.in_msg) return false;

        // Check destination matches our receiver
        if (!this.addressesMatch(t.in_msg.destination, this.receiverAddress)) return false;

        // Check amount matches exactly
        const receivedAmount = BigInt(t.in_msg.value || '0');
        if (receivedAmount !== expectedAmountNano) return false;

        // Check transaction is recent (within MAX_TX_AGE_SECONDS)
        const txAge = nowSeconds - t.utime;
        if (txAge > MAX_TX_AGE_SECONDS) return false;

        return true;
      });

      if (!matchingTx) {
        // Log some debug info about what we found
        const recentTxs = transactions.slice(0, 5).map((t: TonTransaction) => ({
          hash: t.transaction_id.hash,
          amount: t.in_msg?.value,
          age: nowSeconds - t.utime,
          dest: t.in_msg?.destination,
        }));
        logger.warn('TON verification failed: no matching transaction found', {
          expectedAmount: expectedAmountNano.toString(),
          recentTransactions: recentTxs,
        });
        return {
          verified: false,
          error: 'Transaction not found. It may still be processing - please wait a moment and try again.',
        };
      }

      logger.info('TON verification successful', {
        txHash: matchingTx.transaction_id.hash,
        sender: matchingTx.in_msg!.source,
        amount: matchingTx.in_msg!.value,
        lt: matchingTx.transaction_id.lt,
      });

      return {
        verified: true,
        transaction: {
          hash: matchingTx.transaction_id.hash,
          lt: matchingTx.transaction_id.lt,
          amount: matchingTx.in_msg!.value,
          sender: matchingTx.in_msg!.source,
          timestamp: matchingTx.utime,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('TON verification API error', { error: message, stack: error instanceof Error ? error.stack : undefined });
      return {
        verified: false,
        error: `Verification failed: ${message}`,
      };
    }
  }

  /**
   * Verify a TON transaction by memo field
   * More reliable than amount-only matching
   */
  async verifyTransactionByMemo(
    memo: string,
    expectedAmountNano: bigint,
    senderAddress: string
  ): Promise<VerificationResult> {
    logger.info('TON verification by memo', {
      memo,
      expectedAmountNano: expectedAmountNano.toString(),
      senderAddress,
      receiverAddress: this.receiverAddress,
    });

    if (!this.receiverAddress) {
      return {
        verified: false,
        error: 'Payment receiver address not configured',
      };
    }

    try {
      const transactions = await this.tonweb.getTransactions(
        this.receiverAddress,
        MAX_TRANSACTIONS_TO_FETCH
      );

      if (!transactions || transactions.length === 0) {
        return {
          verified: false,
          error: 'No transactions found. Transaction may still be processing.',
        };
      }

      const nowSeconds = Math.floor(Date.now() / 1000);

      // Log first 3 transactions in detail for debugging
      logger.info('Checking transactions for memo match', {
        memo,
        expectedAmountNano: expectedAmountNano.toString(),
        senderAddress,
        receiverAddress: this.receiverAddress,
        totalTransactions: transactions.length,
      });

      const matchingTx = transactions.find((t: TonTransaction, index: number) => {
        const isFirst3 = index < 3;

        if (!t.in_msg) {
          if (isFirst3) logger.info(`[TX ${index}] No in_msg, skipping`);
          return false;
        }

        const txAge = nowSeconds - t.utime;
        const receivedAmount = BigInt(t.in_msg.value || '0');
        const decodedComment = decodeComment(t.in_msg, isFirst3) || '';

        // Log detailed info for first 3 transactions
        if (isFirst3) {
          logger.info(`[TX ${index}] Checking transaction`, {
            hash: t.transaction_id.hash,
            age: txAge,
            amount: t.in_msg.value,
            source: t.in_msg.source,
            destination: t.in_msg.destination,
            decodedComment,
            checks: {
              destMatch: this.addressesMatch(t.in_msg.destination, this.receiverAddress),
              senderMatch: this.addressesMatch(t.in_msg.source, senderAddress),
              amountMatch: receivedAmount === expectedAmountNano,
              memoMatch: decodedComment.includes(memo),
              ageOk: txAge <= MAX_TX_AGE_SECONDS,
            },
          });
        }

        // Check destination matches our receiver
        if (!this.addressesMatch(t.in_msg.destination, this.receiverAddress)) return false;

        // Check sender matches
        if (!this.addressesMatch(t.in_msg.source, senderAddress)) return false;

        // Check amount matches
        if (receivedAmount !== expectedAmountNano) return false;

        // Check memo/message matches
        if (!decodedComment.includes(memo)) return false;

        // Check transaction is recent
        if (txAge > MAX_TX_AGE_SECONDS) return false;

        return true;
      });

      if (!matchingTx) {
        // Log debug info with decoded comments
        const recentTxs = transactions.slice(0, 5).map((t: TonTransaction) => ({
          hash: t.transaction_id.hash,
          amount: t.in_msg?.value,
          comment: decodeComment(t.in_msg),
          source: t.in_msg?.source,
          age: nowSeconds - t.utime,
        }));

        logger.warn('TON verification by memo failed: no match', {
          memo,
          expectedAmount: expectedAmountNano.toString(),
          senderAddress,
          recentTransactions: recentTxs,
        });

        return {
          verified: false,
          error: 'Transaction not found. It may still be processing - please wait and try again.',
        };
      }

      logger.info('TON verification by memo successful', {
        txHash: matchingTx.transaction_id.hash,
        memo,
        sender: matchingTx.in_msg!.source,
        amount: matchingTx.in_msg!.value,
      });

      return {
        verified: true,
        transaction: {
          hash: matchingTx.transaction_id.hash,
          lt: matchingTx.transaction_id.lt,
          amount: matchingTx.in_msg!.value,
          sender: matchingTx.in_msg!.source,
          timestamp: matchingTx.utime,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('TON verification API error', { error: message });
      return {
        verified: false,
        error: `Verification failed: ${message}`,
      };
    }
  }

  /**
   * Compare two TON addresses (handles different formats)
   */
  private addressesMatch(addr1: string, addr2: string): boolean {
    try {
      // Normalize both addresses to the same format
      const address1 = new TonWeb.utils.Address(addr1);
      const address2 = new TonWeb.utils.Address(addr2);

      // Compare in raw format
      return address1.toString(false) === address2.toString(false);
    } catch {
      // If parsing fails, do direct string comparison
      return addr1.toLowerCase() === addr2.toLowerCase();
    }
  }

  /**
   * Convert TON amount to nanoTON
   */
  static toNano(amount: number): bigint {
    return BigInt(TonWeb.utils.toNano(amount));
  }

  /**
   * Convert nanoTON to TON
   */
  static fromNano(amountNano: bigint): number {
    return parseFloat(TonWeb.utils.fromNano(amountNano.toString()));
  }
}

export const tonService = new TonService();
