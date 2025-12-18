import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Header, Section, CoinBalance, BuyCoinsCard, CoinPackage } from '../../components';
import styles from './SettingsPage.module.css';

const coinPackages: CoinPackage[] = [
  { id: 'small', amount: 100, price: 1 },
  { id: 'medium', amount: 500, price: 4, bonus: 25 },
  { id: 'large', amount: 1000, price: 7, bonus: 40 },
  { id: 'xlarge', amount: 5000, price: 30, bonus: 65 },
];

export const SettingsPage = () => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const userBalance = 250.50;

  const handleConnectWallet = () => {
    tonConnectUI.openModal();
  };

  const handleDisconnectWallet = () => {
    tonConnectUI.disconnect();
  };

  const handleBuyCoins = (pkg: CoinPackage) => {
    if (!wallet) {
      tonConnectUI.openModal();
      return;
    }

    // TODO: Implement TON transaction
    console.log('Purchase initiated:', pkg);
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
                    {truncateAddress(wallet.account.address)}
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
          <CoinBalance balance={userBalance} symbol="COINS" />
        </Section>

        <Section title="Buy Coins">
          <div className={styles.packagesGrid}>
            {coinPackages.map((pkg) => (
              <BuyCoinsCard key={pkg.id} package={pkg} onBuy={handleBuyCoins} />
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
};
