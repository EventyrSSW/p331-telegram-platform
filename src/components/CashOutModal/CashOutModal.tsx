import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTonWallet } from '@tonconnect/ui-react';
import { Address } from '@ton/core';
import styles from './CashOutModal.module.css';
import { haptic } from '../../providers/TelegramProvider';
import { api } from '../../services/api';

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
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const wallet = useTonWallet();

  if (!isOpen) return null;

  const handleClose = () => {
    if (isProcessing) return;
    haptic.light();
    setAmount('');
    setWalletAddress('');
    setError('');
    onClose();
  };

  const handlePercentageClick = (percentage: number) => {
    if (isProcessing) return;
    haptic.light();
    const calculatedAmount = (currentBalance * percentage) / 100;
    setAmount(calculatedAmount.toFixed(2));
    setError('');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and one decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError('');
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWalletAddress(e.target.value);
    setError('');
  };

  const handleUseConnectedWallet = () => {
    if (isProcessing || !wallet) return;
    haptic.light();
    const address = Address.parse(wallet.account.address).toString();
    setWalletAddress(address);
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

    const numericAmount = Number(amount);

    // Validation
    if (!amount || numericAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (numericAmount > currentBalance) {
      setError('Insufficient balance');
      return;
    }

    if (!walletAddress.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    if (!validateAddress(walletAddress)) {
      setError('Invalid TON wallet address');
      return;
    }

    setIsProcessing(true);
    haptic.medium();

    try {
      // Deduct coins from user balance
      await api.deductCoins(numericAmount);

      // TODO: Actually send TON transaction to user's wallet
      // This would require backend integration with TON blockchain
      // For now, we just deduct the balance

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

  const numericAmount = Number(amount);
  const isButtonDisabled =
    !amount ||
    numericAmount <= 0 ||
    numericAmount > currentBalance ||
    !walletAddress.trim() ||
    isProcessing;

  const modalContent = (
    <div className={styles.overlay}>
      <button
        className={styles.closeButton}
        onClick={handleClose}
        disabled={isProcessing}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <div className={styles.content}>
        <h2 className={styles.title}>Cash Out</h2>
        <p className={styles.subtitle}>Withdraw your winnings to TON wallet</p>

        <div className={styles.balanceInfo}>
          <span className={styles.balanceLabel}>Available Balance</span>
          <span className={styles.balanceValue}>{currentBalance} coins</span>
        </div>

        <div className={styles.inputSection}>
          <label className={styles.label}>Amount (coins)</label>
          <input
            type="text"
            inputMode="decimal"
            className={styles.input}
            value={amount}
            onChange={handleAmountChange}
            placeholder="0.00"
            disabled={isProcessing}
          />

          <div className={styles.percentageContainer}>
            {[25, 50, 75, 100].map(percentage => (
              <button
                key={percentage}
                className={styles.percentageButton}
                onClick={() => handlePercentageClick(percentage)}
                disabled={isProcessing}
              >
                {percentage}%
              </button>
            ))}
          </div>
        </div>

        <div className={styles.inputSection}>
          <label className={styles.label}>TON Wallet Address</label>
          <input
            type="text"
            className={styles.input}
            value={walletAddress}
            onChange={handleAddressChange}
            placeholder="UQAa..."
            disabled={isProcessing}
          />

          {wallet && (
            <button
              className={styles.useWalletButton}
              onClick={handleUseConnectedWallet}
              disabled={isProcessing}
            >
              Use Connected Wallet
            </button>
          )}
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <div className={styles.bottomSection}>
          <button
            className={styles.cashOutButton}
            onClick={handleCashOut}
            disabled={isButtonDisabled}
          >
            {isProcessing ? (
              'Processing...'
            ) : numericAmount > 0 ? (
              `Cash Out ${amount} coins`
            ) : (
              'Cash Out'
            )}
          </button>
          <p className={styles.infoText}>
            Withdrawal will be processed to your TON wallet
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
