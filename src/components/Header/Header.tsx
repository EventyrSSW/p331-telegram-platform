import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Address, beginCell } from '@ton/core';
import { useConfig } from '../../contexts/ConfigContext';
import { useModal } from '../../contexts/ModalContext';
import { useNakama } from '../../contexts/NakamaContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { AddTonModal } from '../AddTonModal/AddTonModal';
import { MOCK_RANK, MOCK_USER, shouldUseMockData } from '../../utils/mockData';
import TonCoinIcon from '../../assets/icons/toncoin-ton-logo 1.svg?react';
import PlusIcon from '../../assets/icons/vector.svg?react';
import UserIcon from '../../assets/icons/user.svg?react';
import starIconPng from '../../assets/icons/cfcfda09650d68463d93067e00c49b9af785941d.png';
import styles from './Header.module.css';

export const Header = () => {
  const { coins, refreshWallet } = useNakama();
  const { config } = useConfig();
  const { user } = useAuth();
  const { isAddTonModalOpen, openAddTonModal, closeAddTonModal } = useModal();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  const isTestnet = config?.ton.network === 'testnet';

  // Get user avatar - use Telegram photo if available
  const useMockData = shouldUseMockData();
  const displayUser = useMockData ? MOCK_USER : user;
  const userAvatar = displayUser?.photoUrl;

  const handleConnectWallet = () => {
    console.log('[TonConnect] Opening modal...');
    try {
      tonConnectUI.openModal();
      console.log('[TonConnect] Modal opened');
    } catch (error) {
      console.error('[TonConnect] Failed to open modal:', error);
    }
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

      // 1. Create invoice on backend (get memo for transaction matching)
      const invoice = await api.createInvoice(amountInNanoTon);

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

      // 2. Encode memo as TON comment cell (opcode 0 + text)
      const commentCell = beginCell()
        .storeUint(0, 32) // Comment opcode
        .storeStringTail(invoice.memo)
        .endCell();
      const payloadBase64 = commentCell.toBoc().toString('base64');

      // 3. Build transaction with memo for matching
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
        messages: [
          {
            address: receiverAddress,
            amount: amountInNanoTon,
            payload: payloadBase64, // Base64-encoded comment cell
          },
        ],
      };

      // 4. Send transaction via TonConnect
      const result = await tonConnectUI.sendTransaction(transaction);

      // 5. Verify invoice with backend (3-layer duplicate protection)
      const verification = await api.verifyInvoice(
        invoice.invoiceId,
        result.boc,
        wallet.account.address
      );

      if (verification.success) {
        // Refresh wallet to get updated balance
        await refreshWallet();
        alert(`Successfully added ${amount} TON!`);
      } else {
        alert('Payment verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Failed to send TON:', error);

      let errorMessage = 'Failed to send TON. Please try again.';

      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });

        const msg = error.message.toLowerCase();

        if (msg.includes('cancel')) {
          errorMessage = 'Transaction cancelled.';
        } else if (msg.includes('amount')) {
          errorMessage = error.message;
        } else if (msg.includes('network') || msg.includes('fetch') ||
                   msg.includes('timeout') || msg.includes('connection')) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (msg.includes('expired')) {
          errorMessage = 'Invoice expired. Please try again.';
        }
      }

      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <header className={styles.header}>
      {/* Left Section - Avatar and Rank */}
      <Link to="/leaderboard" className={styles.leftSection}>
        {userAvatar ? (
          <img src={userAvatar} alt="avatar" className={styles.avatar} />
        ) : (
          <div className={styles.avatarPlaceholder}>
            <UserIcon className={styles.avatarIcon} />
          </div>
        )}
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
          <span className={styles.tonValue}>{(coins / 100).toFixed(2)}</span>
          <PlusIcon className={styles.plusIcon} />
        </button>
      </div>

      {/* Add TON Modal */}
      <AddTonModal
        isOpen={isAddTonModalOpen}
        onClose={closeAddTonModal}
        currentBalance={coins / 100}
        isWalletConnected={!!wallet}
        onConnectWallet={handleConnectWallet}
        onSendTransaction={handleSendTransaction}
        isProcessing={isProcessing}
      />
    </header>
  );
};
