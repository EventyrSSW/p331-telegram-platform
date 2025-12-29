import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Address } from '@ton/core';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { haptic } from '../../providers/TelegramProvider';
import styles from './CashOutPage.module.css';
import ArrowLeftIcon from '../../assets/icons/arrow-left.svg?react';
import CashIcon from '../../assets/icons/cash.svg?react';
import ArrowRightIcon from '../../assets/icons/arrow-right.svg?react';

export function CashOutPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const isWalletConnected = !!wallet;
  const walletAddress = wallet?.account?.address;
  const currentBalance = user?.coinBalance ?? 0;

  const handleBack = () => {
    haptic.light();
    navigate(-1);
  };

  const handleConnectWallet = () => {
    haptic.medium();
    tonConnectUI.openModal();
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
    if (isProcessing || !walletAddress) return;

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
      await refreshUser();

      // Navigate back to profile
      navigate('/profile');
    } catch (err) {
      console.error('Cash out error:', err);
      setError('Failed to process cash out');
      haptic.error();
    } finally {
      setIsProcessing(false);
    }
  };

  const isButtonDisabled =
    !isWalletConnected ||
    !walletAddress ||
    currentBalance < 6 ||
    isProcessing;

  return (
    <div className={styles.container}>
      {/* Back Button */}
      <div className={styles.backButtonRow}>
        <button className={styles.backButton} onClick={handleBack} disabled={isProcessing}>
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

        {/* Wallet Input or Connect Button */}
        <div className={styles.inputSection}>
          {isWalletConnected ? (
            <>
              <label className={styles.inputLabel}>Cash out to connected wallet</label>
              <div className={styles.connectedWalletDisplay}>
                <span className={styles.walletAddressText}>
                  {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                </span>
              </div>
            </>
          ) : (
            <>
              <label className={styles.inputLabel}>Connect wallet to cash out</label>
              <button
                className={styles.connectWalletButton}
                onClick={handleConnectWallet}
                disabled={isProcessing}
              >
                Connect TON Wallet
              </button>
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className={styles.errorMessage}>{error}</div>
        )}

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
      </div>
    </div>
  );
}
