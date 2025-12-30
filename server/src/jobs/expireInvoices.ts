import { invoiceService } from '../services/invoiceService';
import { logger } from '../utils/logger';

const INTERVAL_MS = 60 * 1000; // Run every minute

let intervalId: NodeJS.Timeout | null = null;

export function startInvoiceExpirationJob() {
  if (intervalId) {
    logger.warn('Invoice expiration job already running');
    return;
  }

  logger.info('Starting invoice expiration job');

  // Run immediately on start
  runExpiration();

  // Then run every minute
  intervalId = setInterval(runExpiration, INTERVAL_MS);
}

export function stopInvoiceExpirationJob() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Stopped invoice expiration job');
  }
}

async function runExpiration() {
  try {
    const count = await invoiceService.expireOldInvoices();
    if (count > 0) {
      logger.info(`Expired ${count} invoices`);
    }
  } catch (error) {
    logger.error('Error expiring invoices', { error });
  }
}
