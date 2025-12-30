// server/src/services/bocParser.ts
import { Cell } from '@ton/core';
import { logger } from '../utils/logger';

export interface ParsedBoc {
  normalizedHash: string;  // SHA256 of cell (hex)
  rawBoc: string;          // Original BOC for audit
}

export class BocParser {
  /**
   * Parse BOC from TonConnect and extract normalized hash.
   * This hash is unique per signed transaction for idempotency.
   */
  static parse(bocBase64: string): ParsedBoc {
    const trimmed = bocBase64?.trim() || '';

    if (!trimmed) {
      throw new Error('BOC cannot be empty');
    }

    // Validate base64 format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(trimmed)) {
      throw new Error('Invalid base64 format');
    }

    try {
      const bocBuffer = Buffer.from(trimmed, 'base64');
      const cells = Cell.fromBoc(bocBuffer);

      if (cells.length === 0) {
        throw new Error('BOC contains no cells');
      }

      const rootCell = cells[0];
      const normalizedHash = rootCell.hash().toString('hex');

      logger.debug('Parsed BOC successfully', {
        normalizedHash,
        bocLength: bocBase64.length,
      });

      return {
        normalizedHash,
        rawBoc: bocBase64,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to parse BOC', { error: message });
      throw new Error(`Invalid BOC format: ${message}`);
    }
  }

  /**
   * Validate if a string is a valid BOC without throwing
   */
  static isValid(bocBase64: string): boolean {
    try {
      this.parse(bocBase64);
      return true;
    } catch {
      return false;
    }
  }
}
