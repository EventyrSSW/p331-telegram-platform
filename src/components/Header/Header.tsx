import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Address } from '@ton/core';
import { useAuth } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
import { api } from '../../services/api';
import { AddTonModal } from '../AddTonModal/AddTonModal';
import styles from './Header.module.css';

export const Header = () => {
  const { user, refreshUser } = useAuth();
  const { config } = useConfig();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [isAddTonModalOpen, setIsAddTonModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isTestnet = config?.ton.network === 'testnet';

  const handleConnectWallet = () => {
    tonConnectUI.openModal();
  };

  const handleSendTransaction = async (amount: number) => {
    if (!wallet || !config?.ton.receiverAddress) {
      if (!config?.ton.receiverAddress) {
        alert('Payment not configured. Please try again later.');
        return;
      }
      tonConnectUI.openModal();
      return;
    }

    setIsProcessing(true);

    try {
      // Convert TON to nanoTON (1 TON = 10^9 nanoTON)
      const amountInNanoTon = (amount * 1_000_000_000).toString();

      // Parse and normalize receiver address for TonConnect
      let receiverAddress: string;
      try {
        const parsed = Address.parse(config.ton.receiverAddress);
        receiverAddress = parsed.toString({ bounceable: true, testOnly: isTestnet });
      } catch (e) {
        console.error('Failed to parse receiver address:', config.ton.receiverAddress, e);
        alert('Invalid payment address configuration. Please contact support.');
        return;
      }

      // Create transaction request
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes from now
        messages: [
          {
            address: receiverAddress,
            amount: amountInNanoTon,
          },
        ],
      };

      // Send transaction - this will open wallet for user confirmation
      const result = await tonConnectUI.sendTransaction(transaction);

      // Transaction successful - add coins to user balance (1 TON = 1 Coin)
      await api.addCoins(amount, {
        transactionHash: result.boc,
        tonAmount: amountInNanoTon,
      });

      // Refresh user data to get updated balance
      await refreshUser();

      alert(`Successfully added ${amount} coins!`);
    } catch (error) {
      console.error('Failed to send TON:', error);

      let errorMessage = 'Failed to send TON. Please try again.';

      if (error instanceof Error) {
        // Log full error for debugging
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });

        const msg = error.message.toLowerCase();

        if (msg.includes('cancel')) {
          errorMessage = 'Transaction cancelled.';
        } else if (msg.includes('amount')) {
          errorMessage = error.message; // Show validation errors
        } else if (msg.includes('network') || msg.includes('fetch') ||
                   msg.includes('timeout') || msg.includes('connection')) {
          errorMessage = 'Network error. Please check your connection.';
        }
      }

      alert(errorMessage);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBalance = (balance: number): string => {
    if (balance >= 1000000) {
      return `${(balance / 1000000).toFixed(1)}M`;
    }
    if (balance >= 1000) {
      return `${(balance / 1000).toFixed(1)}K`;
    }
    return balance.toLocaleString();
  };

  // Mock rank for now - will be replaced with actual rank from API
  const userRank = 42;

  return (
    <header className={styles.header}>
      {/* Rank Section - Links to Leaderboard */}
      <Link to="/leaderboard" className={styles.rankSection}>
        <div className={styles.rankIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
          </svg>
        </div>
        <span className={styles.rankValue}>#{userRank}</span>
      </Link>

      {/* Crystal/Coins Section - In-game currency */}
      <div className={styles.crystalSection}>
        <div className={styles.crystalIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 9L12 22L22 9L12 2Z" fill="currentColor"/>
            <path d="M12 2L7 9H17L12 2Z" fill="currentColor" fillOpacity="0.6"/>
            <path d="M2 9L12 12L7 9H2Z" fill="currentColor" fillOpacity="0.4"/>
            <path d="M22 9L12 12L17 9H22Z" fill="currentColor" fillOpacity="0.4"/>
          </svg>
        </div>
        <span className={styles.crystalValue}>{formatBalance(user?.coinBalance ?? 0)}</span>
      </div>

      {/* TON Balance Section - Opens Add TON Modal */}
      <button
        className={styles.balanceSection}
        onClick={() => setIsAddTonModalOpen(true)}
      >
        <div className={styles.tonIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
            <path d="M12 6L8 12H11V18L16 12H13L12 6Z" fill="currentColor"/>
          </svg>
        </div>
        <span className={styles.balanceValue}>TON</span>
        <div className={styles.addIcon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
      </button>

      {/* Add TON Modal */}
      <AddTonModal
        isOpen={isAddTonModalOpen}
        onClose={() => setIsAddTonModalOpen(false)}
        currentBalance={user?.coinBalance ?? 0}
        isWalletConnected={!!wallet}
        onConnectWallet={handleConnectWallet}
        onSendTransaction={handleSendTransaction}
        isProcessing={isProcessing}
      />
    </header>
  );
};
