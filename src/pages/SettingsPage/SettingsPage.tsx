import { useState, useEffect, useMemo } from 'react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Address } from '@ton/core';
import { Header, Section, CoinBalance, BuyCoinsCard, CoinPackage } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
import { api } from '../../services/api';
import styles from './SettingsPage.module.css';

// Convert raw TON address to user-friendly format
const toUserFriendlyAddress = (rawAddress: string): string => {
  try {
    return Address.parse(rawAddress).toString({ bounceable: false });
  } catch {
    return rawAddress;
  }
};

export const SettingsPage = () => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const { user, isLoading, refreshUser, updateWallet } = useAuth();
  const { config, loading: configLoading } = useConfig();
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Convert wallet address to user-friendly format
  const userFriendlyAddress = useMemo(() => {
    if (!wallet?.account.address) return null;
    return toUserFriendlyAddress(wallet.account.address);
  }, [wallet?.account.address]);

  // Sync wallet address to backend when connected
  useEffect(() => {
    const syncWallet = async () => {
      if (userFriendlyAddress && user && userFriendlyAddress !== user.walletAddress) {
        try {
          await updateWallet(userFriendlyAddress);
        } catch (err) {
          console.error('Failed to sync wallet:', err);
        }
      }
    };
    syncWallet();
  }, [userFriendlyAddress, user, updateWallet]);

  const handleConnectWallet = () => {
    tonConnectUI.openModal();
  };

  const handleDisconnectWallet = () => {
    tonConnectUI.disconnect();
  };

  const handleBuyCoins = async (pkg: CoinPackage) => {
    if (!wallet || !config?.ton.receiverAddress) {
      if (!config?.ton.receiverAddress) {
        alert('Payment not configured. Please try again later.');
        return;
      }
      tonConnectUI.openModal();
      return;
    }

    if (isPurchasing) return;

    setIsPurchasing(true);

    try {
      // Calculate total coins including bonus
      const totalCoins = pkg.amount + (pkg.bonus || 0);

      // Convert TON price to nanoTON (1 TON = 10^9 nanoTON)
      const amountInNanoTon = (pkg.price * 1_000_000_000).toString();

      // Create transaction request
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes from now
        messages: [
          {
            address: config.ton.receiverAddress,
            amount: amountInNanoTon,
          },
        ],
      };

      // Send transaction - this will open wallet for user confirmation
      const result = await tonConnectUI.sendTransaction(transaction);

      console.log('Transaction sent:', result);

      // Transaction successful - add coins to user balance
      await api.addCoins(totalCoins);

      // Refresh user data to get updated balance
      await refreshUser();

      // Show success message
      alert(`Successfully purchased ${totalCoins} coins!`);
    } catch (error) {
      console.error('Failed to purchase coins:', error);

      // Check if user cancelled the transaction
      if (error instanceof Error && error.message.includes('cancelled')) {
        alert('Transaction cancelled.');
      } else {
        alert('Failed to purchase coins. Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <Section title="TON Wallet">
          {wallet ? (
            <div className={styles.walletConnected}>
              <div className={styles.walletInfo}>
                <div>
                  <div className={styles.walletLabel}>Connected Wallet</div>
                  <div className={styles.walletAddress}>
                    {truncateAddress(userFriendlyAddress || wallet.account.address)}
                  </div>
                </div>
                <button
                  className={styles.disconnectButton}
                  onClick={handleDisconnectWallet}
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : user?.walletAddress ? (
            <div className={styles.walletConnected}>
              <div className={styles.walletInfo}>
                <div>
                  <div className={styles.walletLabel}>Saved Wallet</div>
                  <div className={styles.walletAddress}>
                    {truncateAddress(user.walletAddress)}
                  </div>
                </div>
                <button
                  className={styles.connectButton}
                  onClick={handleConnectWallet}
                >
                  Reconnect
                </button>
              </div>
            </div>
          ) : (
            <button className={styles.connectButton} onClick={handleConnectWallet}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 18V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V6M16 12H22M22 12L19 9M22 12L19 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Connect TON Wallet</span>
            </button>
          )}
        </Section>

        <Section title="Game Coins">
          {isLoading ? (
            <div className={styles.balanceLoading}>Loading balance...</div>
          ) : (
            <CoinBalance balance={user?.coinBalance ?? 0} symbol="COINS" />
          )}
        </Section>

        <Section title="Buy Coins">
          {configLoading ? (
            <div className={styles.balanceLoading}>Loading packages...</div>
          ) : !config?.coinPackages || config.coinPackages.length === 0 ? (
            <div className={styles.balanceLoading}>No packages available</div>
          ) : (
            <div className={styles.packagesGrid}>
              {config.coinPackages.map((pkg) => (
                <BuyCoinsCard
                  key={pkg.id}
                  package={{
                    id: pkg.id,
                    amount: pkg.coins,
                    price: pkg.price,
                    bonus: pkg.bonus,
                  }}
                  onBuy={handleBuyCoins}
                />
              ))}
            </div>
          )}
        </Section>
      </main>
    </div>
  );
};
