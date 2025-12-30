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
  };
  out_msgs: Array<{
    source: string;
    destination: string;
    value: string;
    message?: string;
  }>;
}

// Minimum transaction age in seconds for finality (TON achieves finality in ~5 seconds)
const MIN_TX_AGE_SECONDS = 5;

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
   * @param txHash - The transaction hash (base64 encoded)
   * @param expectedAmountNano - Expected amount in nanoTON
   * @returns VerificationResult with transaction details if verified
   */
  async verifyTransaction(
    txHash: string,
    expectedAmountNano: bigint
  ): Promise<VerificationResult> {
    logger.info('TON verification attempt', { txHash, expectedAmountNano: expectedAmountNano.toString() });

    if (!this.receiverAddress) {
      logger.warn('TON verification failed: receiver address not configured');
      return {
        verified: false,
        error: 'Payment receiver address not configured',
      };
    }

    try {
      // Fetch recent transactions for our receiver address
      // TON transactions are identified by (address, lt, hash)
      const transactions = await this.tonweb.getTransactions(
        this.receiverAddress,
        MAX_TRANSACTIONS_TO_FETCH
      );

      if (!transactions || transactions.length === 0) {
        logger.warn('TON verification failed: no transactions found', { txHash });
        return {
          verified: false,
          error: 'No transactions found for receiver address',
        };
      }

      // Find the transaction by hash
      const tx = transactions.find((t: TonTransaction) => t.transaction_id.hash === txHash);

      if (!tx) {
        logger.warn('TON verification failed: transaction not found', { txHash });
        return {
          verified: false,
          error: 'Transaction not found on blockchain',
        };
      }

      // Verify incoming message exists and has correct destination
      if (!tx.in_msg) {
        logger.warn('TON verification failed: no incoming message', { txHash });
        return {
          verified: false,
          error: 'Transaction has no incoming message',
        };
      }

      // Verify destination matches our receiver
      const destAddress = tx.in_msg.destination;
      if (!this.addressesMatch(destAddress, this.receiverAddress)) {
        logger.warn('TON verification failed: destination mismatch', { txHash, destAddress, expected: this.receiverAddress });
        return {
          verified: false,
          error: 'Transaction destination does not match payment address',
        };
      }

      // Verify amount
      const receivedAmount = BigInt(tx.in_msg.value || '0');
      if (receivedAmount < expectedAmountNano) {
        logger.warn('TON verification failed: amount mismatch', { txHash, expected: expectedAmountNano.toString(), received: receivedAmount.toString() });
        return {
          verified: false,
          error: `Amount mismatch: expected ${expectedAmountNano}, got ${receivedAmount}`,
        };
      }

      // TON achieves finality within ~5 seconds (single masterchain block)
      // We can consider transaction confirmed if it appears in our query
      // For extra safety, check transaction age
      const txAge = Date.now() / 1000 - tx.utime;
      if (txAge < MIN_TX_AGE_SECONDS) {
        logger.warn('TON verification failed: transaction too recent', { txHash, txAge });
        return {
          verified: false,
          error: 'Transaction too recent, waiting for confirmation',
        };
      }

      logger.info('TON verification successful', { txHash, sender: tx.in_msg.source, amount: tx.in_msg.value });
      return {
        verified: true,
        transaction: {
          hash: tx.transaction_id.hash,
          lt: tx.transaction_id.lt,
          amount: tx.in_msg.value,
          sender: tx.in_msg.source,
          timestamp: tx.utime,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('TON verification API error', { txHash, error: message });
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
