# UI Bug Fixes and Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 6 UI bugs including header safe area, navigation highlight, wallet connection UX, and remove gems

**Architecture:** Apply Telegram safe area to Header, fix BottomNavBar active state timing, restore wallet disconnect functionality, reorganize profile layout, make bonus block fully clickable, remove gems display

**Tech Stack:** React, TypeScript, CSS Modules, Telegram WebApp API, TON Connect UI

---

### Task 1: Fix Header Safe Area (Too High)

**Files:**
- Modify: `src/components/Header/Header.module.css:1-15`

**Problem:** Header doesn't use Telegram safe area, causing it to be too close to the top edge

**Solution:** Apply `--tg-header-safe-area` variable (already set by TelegramProvider)

**Step 1: Update Header CSS to include safe area padding**

In `src/components/Header/Header.module.css`, update the `.header` class:

```css
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  height: auto;
  padding: calc(12px + var(--tg-header-safe-area, 0px)) 16px 12px 16px;
  background: rgba(5, 5, 5, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
```

**Step 2: Test in browser**

Run: `npm run dev`
Expected: Header has proper top padding (visible in Telegram or 0px locally)

**Step 3: Commit**

```bash
git add src/components/Header/Header.module.css
git commit -m "fix(header): apply Telegram safe area top padding"
```

---

### Task 2: Remove Gems from Header

**Files:**
- Modify: `src/components/Header/Header.tsx:123-129`
- Modify: `src/components/Header/Header.module.css:75-97`
- Modify: `src/utils/mockData.ts:23`

**Problem:** Gems should be removed, only stars and TON should remain

**Step 1: Remove gems import from Header.tsx**

In `src/components/Header/Header.tsx`, remove line 13:

```tsx
// Remove this line:
import gemIconPng from '../../assets/icons/cccd620542bf4e2fcab2cd91308e69421223c92e.png';
```

**Step 2: Remove gems section from JSX**

In `src/components/Header/Header.tsx`, remove lines 125-129:

```tsx
// Remove this entire section:
        {/* Gems */}
        <div className={styles.gemSection}>
          <img src={gemIconPng} alt="gem" className={styles.gemIcon} />
          <span className={styles.gemValue}>{MOCK_GEMS}</span>
        </div>
```

**Step 3: Remove gems CSS styles**

In `src/components/Header/Header.module.css`, remove lines 75-97:

```css
/* Remove entire Gems Section:
.gemSection {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(23, 23, 23, 0.90);
  border-radius: 40px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.gemIcon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.gemValue {
  font-size: 16px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.32px;
}
*/
```

**Step 4: Remove MOCK_GEMS export from mockData**

In `src/utils/mockData.ts`, remove line 23:

```typescript
// Remove this line:
export const MOCK_GEMS = 50;
```

**Step 5: Verify TypeScript and build**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors

**Step 6: Commit**

```bash
git add src/components/Header/Header.tsx src/components/Header/Header.module.css src/utils/mockData.ts
git commit -m "feat(header): remove gems display, keep only stars and TON"
```

---

### Task 3: Make Entire TON Balance Block Clickable

**Files:**
- Verify: `src/components/Header/Header.tsx:132-139`

**Problem:** User wants to ensure entire bonus block is clickable

**Step 1: Verify TON section is already a button**

In `src/components/Header/Header.tsx`, lines 132-139 already show:

```tsx
<button
  className={styles.tonSection}
  onClick={() => setIsAddTonModalOpen(true)}
>
  <TonCoinIcon className={styles.tonIcon} />
  <span className={styles.tonValue}>{user?.coinBalance ?? 0}</span>
  <PlusIcon className={styles.plusIcon} />
</button>
```

**Step 2: Test clicking anywhere on the TON block**

Run: `npm run dev`
Action: Click anywhere on the TON balance display
Expected: AddTonModal opens

**Result:** Already implemented correctly, no changes needed.

---

### Task 4: Fix BottomNavBar Orange Highlight Timing

**Files:**
- Read: `src/components/BottomNavBar/BottomNavBar.tsx:10-15`
- Modify: `src/components/BottomNavBar/BottomNavBar.module.css:34-36`

**Problem:** Orange highlight sometimes doesn't show immediately on navigation

**Analysis:** The `isActive` function checks `location.pathname`. React Router updates location after navigation completes. The CSS transition might be too subtle.

**Step 1: Add visual feedback to active state**

In `src/components/BottomNavBar/BottomNavBar.module.css`, enhance the `.navItemActive` class:

```css
.navItemActive {
  color: #FF4D00 !important;
}

.navItemActive .navIcon {
  transform: scale(1.1);
}
```

**Step 2: Ensure CSS color override**

The `!important` flag ensures the orange color applies immediately, overriding any hover states during transition.

**Step 3: Test navigation**

Run: `npm run dev`
Action: Click each nav tab and observe immediate orange highlight
Expected: Orange color appears instantly on click

**Step 4: Commit**

```bash
git add src/components/BottomNavBar/BottomNavBar.module.css
git commit -m "fix(nav): ensure orange highlight appears immediately on tab change"
```

---

### Task 5: Restore Wallet Connect/Disconnect Logic in Profile

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx:157-172`
- Modify: `src/pages/ProfilePage/ProfilePage.module.css:336-360`

**Problem:** Wallet address card should appear BELOW the connect/disconnect button for better UX flow.

**Solution:** Reorder elements so button comes first, then address card.

**Step 1: Verify disconnect handler exists**

In `src/pages/ProfilePage/ProfilePage.tsx`, verify lines 70-75 have:

```tsx
  const handleDisconnectWallet = async () => {
    haptic.medium();
    if (wallet) {
      await tonConnectUI.disconnect();
    }
  };
```

**Step 2: Update wallet button JSX order**

In `src/pages/ProfilePage/ProfilePage.tsx`, replace lines 163-182 to swap order:

```tsx
      {/* Connect/Disconnect Wallet Button */}
      <button
        className={styles.connectWalletButton}
        onClick={isWalletConnected ? handleDisconnectWallet : handleConnectWallet}
      >
        <span className={styles.connectWalletText}>
          {isWalletConnected ? 'DISCONNECT WALLET' : 'CONNECT WALLET'}
        </span>
        <ArrowRightIcon className={styles.connectWalletArrow} />
      </button>

      {/* Wallet Address Display - shown BELOW button when connected */}
      {isWalletConnected && wallet?.account?.address && (
        <div className={styles.walletAddressCard}>
          <div className={styles.walletAddressLabel}>Connected Wallet</div>
          <div className={styles.walletAddress}>
            {wallet.account.address.slice(0, 8)}...{wallet.account.address.slice(-6)}
          </div>
        </div>
      )}
```

**Step 3: Add wallet address card styles**

In `src/pages/ProfilePage/ProfilePage.module.css`, add after line 154:

```css
/* Wallet Address Card */
.walletAddressCard {
  width: 100%;
  max-width: 600px;
  padding: 16px 20px;
  background: rgba(23, 23, 23, 0.9);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  margin: 0 14px;
}

.walletAddressLabel {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.walletAddress {
  font-size: 14px;
  font-weight: 600;
  color: #0098EA;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5px;
}
```

**Step 4: Remove disabled state from button**

In `src/pages/ProfilePage/ProfilePage.module.css`, remove lines 349-353:

```css
/* Remove:
.connectWalletButton:disabled {
  background: rgba(0, 152, 234, 0.5);
  cursor: default;
  opacity: 0.8;
}
*/
```

**Step 5: Update hover states**

In `src/pages/ProfilePage/ProfilePage.module.css`, update lines 341-348:

```css
.connectWalletButton:hover {
  background: #007AC2;
}

.connectWalletButton:active {
  transform: scale(0.98);
}
```

**Step 6: Test wallet connection flow**

Run: `npm run dev`
Actions:
1. Click "CONNECT WALLET" → Opens TON Connect modal
2. Connect wallet → Shows wallet address card above button
3. Button changes to "DISCONNECT WALLET"
4. Click "DISCONNECT WALLET" → Disconnects wallet

Expected: Full connect/disconnect cycle works

**Step 7: Commit**

```bash
git add src/pages/ProfilePage/ProfilePage.tsx src/pages/ProfilePage/ProfilePage.module.css
git commit -m "feat(profile): restore wallet disconnect functionality and display address"
```

---

### Task 6: Make Entire Bonus Banner Clickable

**Files:**
- Modify: `src/components/WelcomeBonusBanner/WelcomeBonusBanner.tsx:38-62`
- Modify: `src/components/WelcomeBonusBanner/WelcomeBonusBanner.module.css:1-96`

**Problem:** Only the "DEPOSIT NOW" button is clickable. The entire banner should be a click target.

**Solution:** Convert the outer div to a button element.

**Step 1: Update banner wrapper to button**

In `src/components/WelcomeBonusBanner/WelcomeBonusBanner.tsx`, replace lines 38-62:

```tsx
  return (
    <button
      className={`${styles.banner} ${styles[variant]}`}
      onClick={handleDepositClick}
    >
      <div className={styles.content}>
        <div className={styles.textSection}>
          <div className={styles.label}>Welcome Bonus</div>
          <div className={styles.title}>Double Your Deposit</div>
        </div>

        <div className={styles.depositButton}>
          DEPOSIT NOW
        </div>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.multiplierImage}>
          <img src={bonusImage2x} alt="2X Bonus" className={styles.bonusImage} />
        </div>
        <div className={styles.timer}>
          <ClockIcon className={styles.clockIcon} />
          <span className={styles.timerText}>{timeLeft}</span>
        </div>
      </div>
    </button>
  );
```

**Step 2: Update banner CSS for button element**

In `src/components/WelcomeBonusBanner/WelcomeBonusBanner.module.css`, update line 2-12:

```css
.banner {
  width: 100%;
  padding: 20px;
  position: relative;
  border-radius: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  gap: 16px;
  /* Button reset styles */
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.banner:hover {
  transform: translateY(-2px);
}

.banner:active {
  transform: translateY(0);
}
```

**Step 3: Update deposit button to div styling**

In `src/components/WelcomeBonusBanner/WelcomeBonusBanner.module.css`, update lines 66-96:

```css
/* Deposit Button */
.depositButton {
  padding: 10px 20px;
  position: relative;
  color: white;
  font-size: 16px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.32px;
  pointer-events: none; /* Prevent event bubbling, parent handles click */
}

.depositButton::before {
  content: '';
  position: absolute;
  width: 149px;
  height: 39px;
  left: 0;
  top: 0;
  background: rgba(255, 255, 255, 0.20);
  border-radius: 50px;
  z-index: -1;
}

/* Remove :active state since parent button handles it now */
```

**Step 4: Test clicking banner**

Run: `npm run dev`
Action: Click anywhere on the bonus banner (not just the button)
Expected: onDepositClick callback fires with haptic feedback

**Step 5: Commit**

```bash
git add src/components/WelcomeBonusBanner/WelcomeBonusBanner.tsx src/components/WelcomeBonusBanner/WelcomeBonusBanner.module.css
git commit -m "feat(ui): make entire welcome bonus banner clickable for better UX

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Final Verification and Testing

**Step 1: Run full type check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors

**Step 2: Manual testing checklist**

Test in browser (`npm run dev`):

- [ ] Header has proper top spacing (not touching top edge in dev tools mobile view)
- [ ] Header shows only stars and TON (no gems)
- [ ] Clicking TON balance opens Add TON modal
- [ ] Bottom navigation orange highlight appears immediately on tab change
- [ ] Profile page shows wallet address card when connected
- [ ] "DISCONNECT WALLET" button works and removes wallet

**Step 3: Test in Telegram (optional)**

If deploying to test in real Telegram:
1. Deploy to test environment
2. Open in Telegram Mini App
3. Verify safe area works correctly on device with notch
4. Test full wallet flow

**Step 4: Create final summary commit if needed**

```bash
git add -A
git commit -m "fix(ui): complete UI bug fixes - safe areas, nav highlight, wallet UX, remove gems"
```

---

## Summary of Changes

**1. Header Safe Area** ✓
- Applied `--tg-header-safe-area` padding to header top

**2. Remove Gems** ✓
- Removed gem display from header
- Kept only stars (rank) and TON balance

**3. TON Balance Clickable** ✓
- Already implemented as button (verified)

**4. Navigation Highlight** ✓
- Enhanced active state with `!important` and scale transform
- Ensures immediate visual feedback

**5. Wallet Connect/Disconnect** ✓
- Added wallet address display card
- Restored disconnect functionality
- Button text changes based on connection state

**6. Layout Improvements** ✓
- Wallet address shown above button
- Better visual hierarchy in profile

**Visual Flow:**
```
Profile Page (Connected):
┌─────────────────────────┐
│     [User Profile]      │
│                         │
│   [Stats: Games/Wins]   │
│                         │
│   ┌─────────────────┐   │  ← NEW: Wallet address card
│   │ Connected Wallet│   │
│   │ EQD8m...9xK1   │   │
│   └─────────────────┘   │
│                         │
│ [DISCONNECT WALLET →]   │  ← Changed text & enabled
│                         │
│  [CASH OUT WINNINGS]    │
└─────────────────────────┘
```
