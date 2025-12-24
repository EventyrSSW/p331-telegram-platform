import { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './AddTonModal.module.css';
import { haptic } from '../../providers/TelegramProvider';

interface AddTonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  isWalletConnected: boolean;
  onConnectWallet: () => void;
  onSendTransaction: (amount: number) => Promise<void>;
  isProcessing?: boolean;
}

const PRESET_AMOUNTS = [10, 20, 50];
const MAX_AMOUNT = 10000;

/**
 * Checks if adding a digit would create an invalid leading zero pattern
 * Valid: "0", "0.", "0.1", "10", "100"
 * Invalid: "00", "00.", "000", "000001"
 */
const wouldCreateInvalidLeadingZeros = (currentValue: string, newDigit: string): boolean => {
  // If trying to add "0" to current "0", it's invalid (would create "00")
  if (currentValue === '0' && newDigit === '0') {
    return true;
  }

  // If current value starts with "0" followed by a digit (not a decimal point), it's invalid
  // This catches cases where someone tries to build "00.1" by typing "0" then "0" then "."
  if (currentValue.length > 1 && currentValue[0] === '0' && currentValue[1] !== '.') {
    return true;
  }

  return false;
};

export function AddTonModal({
  isOpen,
  onClose,
  currentBalance,
  isWalletConnected,
  onConnectWallet,
  onSendTransaction,
  isProcessing = false,
}: AddTonModalProps) {
  const [amount, setAmount] = useState('0');

  if (!isOpen) return null;

  const handleClose = () => {
    if (isProcessing) return;
    haptic.light();
    setAmount('0');
    onClose();
  };

  const handlePresetClick = (presetAmount: number) => {
    if (isProcessing) return;
    haptic.light();
    setAmount(presetAmount.toString());
  };

  const handleNumpadClick = (value: string) => {
    if (isProcessing) return;
    haptic.light();

    if (value === 'backspace') {
      setAmount(prev => {
        if (prev.length <= 1) return '0';
        return prev.slice(0, -1);
      });
      return;
    }

    if (value === '.') {
      setAmount(prev => {
        // Don't add decimal if already has one
        if (prev.includes('.')) return prev;
        return prev + '.';
      });
      return;
    }

    setAmount(prev => {
      // Check for invalid leading zeros BEFORE processing the digit
      if (wouldCreateInvalidLeadingZeros(prev, value)) {
        return prev; // Reject the input
      }

      // If current is just "0", replace with new digit (unless it's another 0)
      if (prev === '0' && value !== '0') return value;

      // Limit decimal places to 2
      const decimalIndex = prev.indexOf('.');
      if (decimalIndex !== -1 && prev.length - decimalIndex > 2) return prev;

      const newAmount = prev + value;
      if (Number(newAmount) > MAX_AMOUNT) return prev;
      return newAmount;
    });
  };

  const handleAction = async () => {
    if (isProcessing) return;

    if (!isWalletConnected) {
      haptic.medium();
      onConnectWallet(); // TonConnect modal will appear on top due to higher z-index
      return;
    }

    const numericAmount = Number(amount);
    if (numericAmount > 0) {
      haptic.medium();
      try {
        await onSendTransaction(numericAmount);
        setAmount('0');
        onClose();
      } catch {
        // Error handling is done in the parent component
      }
    }
  };

  const numericAmount = Number(amount);
  const isButtonDisabled = isWalletConnected && numericAmount === 0;

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
        <div className={styles.balanceContainer}>
          Balance: {currentBalance.toFixed(2)} TON
        </div>

        <div className={styles.amountDisplay}>
          <span className={styles.amountValue}>{amount}</span>
          <span className={styles.amountUnit}>TON</span>
        </div>

        <div className={styles.presetContainer}>
          {PRESET_AMOUNTS.map(preset => (
            <button
              key={preset}
              className={styles.presetButton}
              onClick={() => handlePresetClick(preset)}
              disabled={isProcessing}
            >
              {preset} TON
            </button>
          ))}
        </div>

        <div className={styles.numpad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
            <button
              key={digit}
              className={styles.numpadKey}
              onClick={() => handleNumpadClick(digit)}
              disabled={isProcessing}
            >
              {digit}
            </button>
          ))}
          <button
            className={styles.numpadKey}
            onClick={() => handleNumpadClick('.')}
            disabled={isProcessing}
          >
            .
          </button>
          <button
            className={styles.numpadKey}
            onClick={() => handleNumpadClick('0')}
            disabled={isProcessing}
          >
            0
          </button>
          <button
            className={styles.numpadKey}
            onClick={() => handleNumpadClick('backspace')}
            disabled={isProcessing}
          >
            <svg
              className={styles.backspaceIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 9l6 6m0-6l-6 6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        <div className={styles.bottomSection}>
          <button
            className={`${styles.addButton} ${!isWalletConnected ? styles.connectButton : ''}`}
            onClick={handleAction}
            disabled={isButtonDisabled || isProcessing}
          >
            {isProcessing ? (
              'Processing...'
            ) : !isWalletConnected ? (
              'Connect Wallet'
            ) : numericAmount > 0 ? (
              `Add ${amount} TON`
            ) : (
              'Add TON'
            )}
          </button>
          <p className={styles.termsText}>
            By adding TON you agree to our{' '}
            <a href="#" onClick={(e) => e.preventDefault()}>Terms of Use</a>
          </p>
        </div>
      </div>
    </div>
  );

  // Use portal to render at body level, ensuring it covers BottomNavBar
  return createPortal(modalContent, document.body);
}
