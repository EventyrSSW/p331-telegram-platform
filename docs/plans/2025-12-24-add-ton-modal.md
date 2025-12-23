# Add TON Balance Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a full-screen modal for adding TON balance, triggered by clicking the TON icon in the Header.

**Architecture:** Create a new `AddTonModal` component with numpad input, preset amounts, and balance display. Modify Header to show modal instead of navigating to /store. Keep existing StorePage unchanged.

**Tech Stack:** React, TypeScript, CSS Modules, existing design system

---

## Task 1: Create AddTonModal Component

**Files:**
- Create: `src/components/AddTonModal/AddTonModal.tsx`
- Create: `src/components/AddTonModal/AddTonModal.module.css`
- Create: `src/components/AddTonModal/index.ts`

**Step 1: Create index.ts**

Create `src/components/AddTonModal/index.ts`:
```typescript
export { AddTonModal } from './AddTonModal';
```

**Step 2: Create CSS module**

Create `src/components/AddTonModal/AddTonModal.module.css`:
```css
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000000;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  padding-top: var(--tg-header-safe-area, 0px);
}

.closeButton {
  position: absolute;
  top: calc(16px + var(--tg-header-safe-area, 0px));
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #3D3D3D;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  cursor: pointer;
  z-index: 10;
}

.closeButton:active {
  transform: scale(0.95);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px 24px;
}

/* Balance Display */
.balanceContainer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(45, 45, 45, 0.8);
  border-radius: 20px;
  margin-bottom: 32px;
}

.balanceIcon {
  width: 20px;
  height: 20px;
  color: #9CA3AF;
}

.balanceText {
  font-size: 14px;
  color: #9CA3AF;
}

/* Amount Display */
.amountDisplay {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 32px;
}

.amountValue {
  font-size: 72px;
  font-weight: 700;
  color: #FFFFFF;
}

.amountUnit {
  font-size: 32px;
  font-weight: 700;
  color: #FFFFFF;
  margin-left: 8px;
}

/* Preset Buttons */
.presetContainer {
  display: flex;
  gap: 12px;
  margin-bottom: 40px;
  flex-wrap: wrap;
  justify-content: center;
}

.presetButton {
  padding: 10px 16px;
  background: #2D2D2D;
  border: none;
  border-radius: 20px;
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.presetButton:hover {
  background: #3D3D3D;
}

.presetButton:active {
  transform: scale(0.95);
}

/* Numpad */
.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px 32px;
  width: 100%;
  max-width: 300px;
  margin-bottom: auto;
}

.numpadKey {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #FFFFFF;
  font-size: 32px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 12px;
  transition: background 0.15s;
}

.numpadKey:hover {
  background: rgba(255, 255, 255, 0.05);
}

.numpadKey:active {
  background: rgba(255, 255, 255, 0.1);
}

.numpadKeyEmpty {
  cursor: default;
}

.numpadKeyEmpty:hover {
  background: transparent;
}

.backspaceIcon {
  width: 28px;
  height: 28px;
}

/* Bottom Section */
.bottomSection {
  width: 100%;
  padding: 0 24px;
  padding-bottom: calc(24px + var(--tg-safe-area-bottom, 0px));
}

.addButton {
  width: 100%;
  height: 56px;
  background: #4D4D4D;
  border: none;
  border-radius: 28px;
  color: #FFFFFF;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.addButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.addButton:not(:disabled):hover {
  background: #5D5D5D;
}

.addButton:not(:disabled):active {
  transform: scale(0.98);
}

.termsText {
  margin-top: 16px;
  font-size: 12px;
  color: #6B7280;
  text-align: center;
}

.termsLink {
  color: #6B7280;
  text-decoration: underline;
}
```

**Step 3: Create component**

Create `src/components/AddTonModal/AddTonModal.tsx`:
```typescript
import { useState } from 'react';
import { haptic } from '../../providers/TelegramProvider';
import styles from './AddTonModal.module.css';

interface AddTonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onAdd: (amount: number) => void;
}

const PRESET_AMOUNTS = [10, 20, 50, 100];
const MAX_AMOUNT = 10000;

export const AddTonModal = ({ isOpen, onClose, currentBalance, onAdd }: AddTonModalProps) => {
  const [amount, setAmount] = useState('0');

  if (!isOpen) return null;

  const handleClose = () => {
    haptic.light();
    setAmount('0');
    onClose();
  };

  const handlePresetClick = (value: number) => {
    haptic.light();
    setAmount(value.toString());
  };

  const handleNumpadClick = (key: string) => {
    haptic.light();

    if (key === 'backspace') {
      setAmount(prev => {
        if (prev.length <= 1) return '0';
        return prev.slice(0, -1);
      });
      return;
    }

    setAmount(prev => {
      if (prev === '0') {
        return key;
      }
      const newValue = prev + key;
      if (parseInt(newValue) > MAX_AMOUNT) {
        return prev;
      }
      return newValue;
    });
  };

  const handleAdd = () => {
    const numAmount = parseInt(amount);
    if (numAmount > 0) {
      haptic.medium();
      onAdd(numAmount);
      setAmount('0');
      onClose();
    }
  };

  const numpadKeys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '', '0', 'backspace'
  ];

  const numAmount = parseInt(amount);

  return (
    <div className={styles.overlay}>
      <button className={styles.closeButton} onClick={handleClose}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      <div className={styles.content}>
        {/* Balance Display */}
        <div className={styles.balanceContainer}>
          <svg className={styles.balanceIcon} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M12 6L8 12H11V18L16 12H13L12 6Z" fill="currentColor"/>
          </svg>
          <span className={styles.balanceText}>Balance: {currentBalance} TON</span>
        </div>

        {/* Amount Display */}
        <div className={styles.amountDisplay}>
          <span className={styles.amountValue}>{amount}</span>
          <span className={styles.amountUnit}>TON</span>
        </div>

        {/* Preset Buttons */}
        <div className={styles.presetContainer}>
          {PRESET_AMOUNTS.map(value => (
            <button
              key={value}
              className={styles.presetButton}
              onClick={() => handlePresetClick(value)}
            >
              {value} TON
            </button>
          ))}
        </div>

        {/* Numpad */}
        <div className={styles.numpad}>
          {numpadKeys.map((key, index) => (
            <button
              key={index}
              className={`${styles.numpadKey} ${key === '' ? styles.numpadKeyEmpty : ''}`}
              onClick={() => key && handleNumpadClick(key)}
              disabled={key === ''}
            >
              {key === 'backspace' ? (
                <svg className={styles.backspaceIcon} viewBox="0 0 24 24" fill="none">
                  <path d="M21 4H8L1 12L8 20H21C21.55 20 22 19.55 22 19V5C22 4.45 21.55 4 21 4ZM18 15.59L16.59 17L14 14.41L11.41 17L10 15.59L12.59 13L10 10.41L11.41 9L14 11.59L16.59 9L18 10.41L15.41 13L18 15.59Z" fill="currentColor"/>
                </svg>
              ) : (
                key
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className={styles.bottomSection}>
        <button
          className={styles.addButton}
          onClick={handleAdd}
          disabled={numAmount === 0}
        >
          Add
        </button>
        <p className={styles.termsText}>
          By submitting your transaction you agree to the{' '}
          <a href="/terms" className={styles.termsLink}>Terms of Use</a>
        </p>
      </div>
    </div>
  );
};
```

**Step 4: Export from components index**

Add to `src/components/index.ts`:
```typescript
export { AddTonModal } from './AddTonModal';
```

**Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`

Expected: No errors

**Step 6: Commit**

```bash
git add src/components/AddTonModal/ src/components/index.ts
git commit -m "feat: add AddTonModal component with numpad input"
```

---

## Task 2: Modify Header to Use Modal

**Files:**
- Modify: `src/components/Header/Header.tsx`

**Step 1: Update Header to manage modal state and render**

Change `src/components/Header/Header.tsx`:
```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AddTonModal } from '../AddTonModal';
import { haptic } from '../../providers/TelegramProvider';
import styles from './Header.module.css';

export const Header = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatBalance = (balance: number): string => {
    if (balance >= 1000000) {
      return `${(balance / 1000000).toFixed(1)}M`;
    }
    if (balance >= 1000) {
      return `${(balance / 1000).toFixed(1)}K`;
    }
    return balance.toLocaleString();
  };

  const handleTonClick = () => {
    haptic.light();
    setIsModalOpen(true);
  };

  const handleAddTon = (amount: number) => {
    // TODO: Integrate with TON payment flow
    console.log('Add TON:', amount);
  };

  // Mock rank for now - will be replaced with actual rank from API
  const userRank = 42;
  // Mock TON balance - will be replaced with actual balance
  const tonBalance = 0;

  return (
    <>
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

        {/* TON Balance Section - Opens Modal */}
        <button className={styles.balanceSection} onClick={handleTonClick}>
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
      </header>

      <AddTonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentBalance={tonBalance}
        onAdd={handleAddTon}
      />
    </>
  );
};
```

**Step 2: Update Header CSS - change Link to button styling**

Add to `src/components/Header/Header.module.css` (modify .balanceSection):
```css
/* Update .balanceSection to work as both Link and button */
.balanceSection {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  text-decoration: none;
  transition: all var(--transition-fast);
  border: none;
  cursor: pointer;
  font-family: inherit;
}
```

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`

Expected: No errors

**Step 4: Commit**

```bash
git add src/components/Header/
git commit -m "feat: Header opens AddTonModal instead of navigating to store"
```

---

## Task 3: Test and Verify

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Manual testing checklist**

- [ ] Click TON icon in Header
- [ ] Modal opens with black background
- [ ] Close button (X) works
- [ ] Balance shows "Balance: 0 TON"
- [ ] Amount starts at "0 TON"
- [ ] Preset buttons (10, 20, 50, 100) update amount
- [ ] Numpad digits update amount
- [ ] Backspace removes last digit
- [ ] Add button disabled when amount is 0
- [ ] Add button enabled when amount > 0
- [ ] Click Add closes modal
- [ ] Haptic feedback on button clicks
- [ ] StorePage still works independently

**Step 3: Run build**

Run: `npm run build`

Expected: Build succeeds

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete Add TON modal implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Create AddTonModal component | 3 new files + 1 modified |
| 2 | Modify Header to use modal | 2 modified |
| 3 | Test and verify | verification |

**Total new files:** 3
**Total modified files:** 3

**Note:** StorePage remains unchanged and accessible via BottomNavBar for wallet connection and coin purchases.
