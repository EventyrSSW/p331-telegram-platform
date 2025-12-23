import { useState } from 'react';
import styles from './AddTonModal.module.css';
import { haptic } from '@telegram-apps/sdk-react';

interface AddTonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onAdd: (amount: number) => void;
}

const PRESET_AMOUNTS = [10, 20, 50, 100];
const MAX_AMOUNT = 10000;

export function AddTonModal({ isOpen, onClose, currentBalance, onAdd }: AddTonModalProps) {
  const [amount, setAmount] = useState('0');

  if (!isOpen) return null;

  const handleClose = () => {
    haptic.impactOccurred('light');
    setAmount('0');
    onClose();
  };

  const handlePresetClick = (presetAmount: number) => {
    haptic.impactOccurred('light');
    setAmount(presetAmount.toString());
  };

  const handleNumpadClick = (value: string) => {
    haptic.impactOccurred('light');

    if (value === 'backspace') {
      setAmount(prev => {
        if (prev.length <= 1) return '0';
        return prev.slice(0, -1);
      });
      return;
    }

    setAmount(prev => {
      if (prev === '0') return value;
      const newAmount = prev + value;
      if (Number(newAmount) > MAX_AMOUNT) return prev;
      return newAmount;
    });
  };

  const handleAdd = () => {
    const numericAmount = Number(amount);
    if (numericAmount > 0) {
      haptic.impactOccurred('medium');
      onAdd(numericAmount);
      setAmount('0');
      onClose();
    }
  };

  const numericAmount = Number(amount);

  return (
    <div className={styles.overlay}>
      <button className={styles.closeButton} onClick={handleClose}>
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
            >
              {digit}
            </button>
          ))}
          <div className={`${styles.numpadKey} ${styles.numpadKeyEmpty}`} />
          <button
            className={styles.numpadKey}
            onClick={() => handleNumpadClick('0')}
          >
            0
          </button>
          <button
            className={styles.numpadKey}
            onClick={() => handleNumpadClick('backspace')}
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
            className={styles.addButton}
            onClick={handleAdd}
            disabled={numericAmount === 0}
          >
            Add {numericAmount > 0 ? `${amount} TON` : 'TON'}
          </button>
          <p className={styles.termsText}>
            By adding TON you agree to our{' '}
            <a href="#" onClick={(e) => e.preventDefault()}>Terms of Use</a>
          </p>
        </div>
      </div>
    </div>
  );
}
