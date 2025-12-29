import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Address } from '@ton/core';
import { useAuth } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
import { useModal } from '../../contexts/ModalContext';
import { api } from '../../services/api';
import { AddTonModal } from '../AddTonModal/AddTonModal';
import { MOCK_RANK } from '../../utils/mockData';
import TonCoinIcon from '../../assets/icons/toncoin-ton-logo 1.svg?react';
import PlusIcon from '../../assets/icons/vector.svg?react';
import starIconPng from '../../assets/icons/cfcfda09650d68463d93067e00c49b9af785941d.png';
import avatarSvg from '../../assets/icons/Ellipse 1.svg';
import styles from './Header.module.css';

export const Header = () => {
  const { user, refreshUser } = useAuth();
  const { config } = useConfig();
  const { isAddTonModalOpen, openAddTonModal, closeAddTonModal } = useModal();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
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

  return (
    <header className={styles.header}>
      {/* Left Section - Avatar and Rank */}
      <Link to="/leaderboard" className={styles.leftSection}>
        <img src={avatarSvg} alt="avatar" className={styles.avatar} />
        <img src={starIconPng} alt="star" className={styles.starIcon} />
        <span className={styles.rankValue}>{MOCK_RANK}</span>
      </Link>

      {/* Right Section - TON */}
      <div className={styles.rightSection}>
        {/* Coin Balance with Add Button */}
        <button
          className={styles.tonSection}
          onClick={openAddTonModal}
        >
          <TonCoinIcon className={styles.tonIcon} />
          <span className={styles.tonValue}>{user?.coinBalance ?? 0}</span>
          <PlusIcon className={styles.plusIcon} />
        </button>
      </div>

      {/* Add TON Modal */}
      <AddTonModal
        isOpen={isAddTonModalOpen}
        onClose={closeAddTonModal}
        currentBalance={user?.coinBalance ?? 0}
        isWalletConnected={!!wallet}
        onConnectWallet={handleConnectWallet}
        onSendTransaction={handleSendTransaction}
        isProcessing={isProcessing}
      />
    </header>
  );
};
