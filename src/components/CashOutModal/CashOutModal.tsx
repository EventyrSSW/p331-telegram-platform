import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Address } from '@ton/core';
import styles from './CashOutModal.module.css';
import { haptic } from '../../providers/TelegramProvider';
import { api } from '../../services/api';
import ArrowLeftIcon from '../../assets/icons/arrow-left.svg?react';
import CashIcon from '../../assets/icons/cash.svg?react';
import ArrowRightIcon from '../../assets/icons/arrow-right.svg?react';

interface CashOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess: () => void;
}

export function CashOutModal({
  isOpen,
  onClose,
  currentBalance,
  onSuccess,
}: CashOutModalProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isProcessing) return;
    haptic.light();
    setWalletAddress('');
    setError('');
    onClose();
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWalletAddress(e.target.value);
    setError('');
  };

  const validateAddress = (address: string): boolean => {
    try {
      Address.parse(address);
      return true;
    } catch {
      return false;
    }
  };

  const handleCashOut = async () => {
    if (isProcessing) return;

    // Simple validation - just check if wallet address is not empty
    if (!walletAddress.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    if (!validateAddress(walletAddress)) {
      setError('Invalid TON wallet address');
      return;
    }

    // Minimum withdraw validation
    if (currentBalance < 6) {
      setError('Minimum withdraw is $6');
      return;
    }

    setIsProcessing(true);
    haptic.medium();

    try {
      // Deduct all balance (simplified - no amount selection)
      await api.deductCoins(currentBalance);

      haptic.success();
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Cash out error:', err);
      setError('Failed to process cash out');
      haptic.error();
    } finally {
      setIsProcessing(false);
    }
  };

  const isButtonDisabled =
    !walletAddress.trim() ||
    currentBalance < 6 ||
    isProcessing;

  const modalContent = (
    <div className={styles.overlay}>
      {/* Back Button */}
      <div className={styles.backButtonRow}>
        <button className={styles.backButton} onClick={handleClose} disabled={isProcessing}>
          <ArrowLeftIcon className={styles.backIcon} />
          <span>BACK</span>
        </button>
      </div>

      <div className={styles.content}>
        {/* Balance Display */}
        <div className={styles.balanceSection}>
          <div className={styles.balanceDisplay}>
            <CashIcon className={styles.cashIcon} />
            <span className={styles.balanceAmount}>{currentBalance}</span>
          </div>
          <p className={styles.balanceLabel}>Current balance</p>
        </div>

        {/* Info Section */}
        <div className={styles.infoSection}>
          <h2 className={styles.infoTitle}>Cash Out</h2>
          <p className={styles.infoText}>Only winnings can be withdraw</p>
          <p className={styles.infoText}>Bonus cash is forfeited upon withdraw</p>
          <p className={styles.infoText}>$6 minimum withdraw</p>
        </div>

        {/* Wallet Input */}
        <div className={styles.inputSection}>
          <label className={styles.inputLabel}>Enter TON wallet address</label>
          <input
            type="text"
            className={styles.walletInput}
            value={walletAddress}
            onChange={handleAddressChange}
            placeholder="Some numbers & letters..."
            disabled={isProcessing}
          />
        </div>

        {/* Cash Out Button */}
        <div className={styles.bottomSection}>
          <button
            className={styles.cashOutButton}
            onClick={handleCashOut}
            disabled={isButtonDisabled}
          >
            <span>Cash Out</span>
            <ArrowRightIcon className={styles.arrowIcon} />
          </button>
        </div>

        {error && (
          <div className={styles.errorMessage}>{error}</div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
