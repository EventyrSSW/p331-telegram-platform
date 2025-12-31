import TonWeb from 'tonweb';
import { configService } from '../services/configService';
import { logger } from './logger';

/**
 * Normalize a TON address to user-friendly non-bounceable format.
 * Handles both raw format (0:hex...) and user-friendly format.
 *
 * @param address - TON address in any format
 * @returns User-friendly non-bounceable address (e.g., 0QDQP... for testnet, UQDQP... for mainnet)
 */
export async function normalizeAddress(address: string): Promise<string> {
  if (!address || address.trim() === '') {
    throw new Error('Address cannot be empty');
  }

  try {
    const tonConfig = await configService.getTonConfig();
    const isTestnet = tonConfig.network === 'testnet';

    const addr = new TonWeb.utils.Address(address);

    // toString(isUserFriendly, isUrlSafe, isBounceable, isTestOnly)
    // We want: user-friendly, url-safe, non-bounceable, testnet-aware
    return addr.toString(true, true, false, isTestnet);
  } catch (error) {
    logger.error('Failed to normalize TON address', {
      address,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(`Invalid TON address: ${address}`);
  }
}

/**
 * Synchronous version for cases where we know the network.
 * Use this when you already have the network config.
 */
export function normalizeAddressSync(address: string, isTestnet: boolean): string {
  if (!address || address.trim() === '') {
    throw new Error('Address cannot be empty');
  }

  try {
    const addr = new TonWeb.utils.Address(address);
    return addr.toString(true, true, false, isTestnet);
  } catch (error) {
    throw new Error(`Invalid TON address: ${address}`);
  }
}
