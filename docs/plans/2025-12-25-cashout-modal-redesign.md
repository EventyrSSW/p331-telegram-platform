# Cash Out Modal Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the CashOutModal component to match the new dark theme design specifications with simplified UI

**Architecture:** Update existing CashOutModal component with new layout, remove amount input and percentage buttons, simplify to only wallet address input with current balance display

**Tech Stack:** React, TypeScript, CSS Modules, existing icon library (CashIcon, ArrowRightIcon)

---

## Context

The CashOutModal currently has:
- Amount input field with percentage buttons (25%, 50%, 75%, 100%)
- Wallet address input
- "Use Connected Wallet" button
- Green gradient cash out button

The new design requires:
- Simpler layout with full-screen modal (background #171717)
- Back button with left arrow icon (top-left)
- Current balance display with cash icon (40x40 size, #0098EA blue)
- Balance shown as large number (30px font, white)
- "Current balance" label (#0098EA blue, 18px)
- "Cash Out" section title (white, 18px, bold)
- Three informational text lines (gray #9F9F9F, 14px):
  - "Only winnings can be withdraw"
  - "Bonus cash is forfeited upon withdraw"
  - "$6 minimum withdraw"
- Wallet address input field (dark background #252525, placeholder color #3D3D3D)
- Orange primary button at bottom (#FF4D00) with "CASH OUT" text and right arrow icon

**Remove:**
- Amount input field
- Percentage buttons (25%, 50%, 75%, 100%)
- "Use Connected Wallet" button
- Close button (X) in top-right

**Add:**
- Back button functionality (closes modal)
- Arrow icons integration from existing icon library

---

## Task 1: Update CashOutModal Component Structure

**Files:**
- Modify: `src/components/CashOutModal/CashOutModal.tsx`

**Context:** Remove amount-related functionality, add back button, integrate arrow icons, simplify to only wallet address input.

**Step 1: Add icon imports**

Add at top of file after existing imports:

```typescript
import ArrowLeftIcon from '../../assets/icons/arrow-left.svg?react';
import ArrowRightIcon from '../../assets/icons/arrow-right.svg?react';
import CashIcon from '../../assets/icons/cash.svg?react';
```

**Step 2: Remove amount state and functions**

Remove these lines:
- Line 22: `const [amount, setAmount] = useState('');`
- Lines 39-45: `handlePercentageClick` function
- Lines 47-54: `handleAmountChange` function
- Line 127: `const numericAmount = Number(amount);`
- Lines 128-133: `isButtonDisabled` logic

**Step 3: Update validation logic**

Replace the `handleCashOut` function (lines 78-125) with simplified version:

```typescript
const handleCashOut = async () => {
  if (isProcessing) return;

  // Validation
  if (!walletAddress.trim()) {
    setError('Please enter a wallet address');
    return;
  }

  if (!validateAddress(walletAddress)) {
    setError('Invalid TON wallet address');
    return;
  }

  // Check minimum withdraw ($6 = 6 coins assuming 1:1 ratio)
  const MIN_WITHDRAW = 6;
  if (currentBalance < MIN_WITHDRAW) {
    setError(`Minimum withdraw amount is $${MIN_WITHDRAW}`);
    return;
  }

  setIsProcessing(true);
  haptic.medium();

  try {
    // Withdraw entire available balance
    await api.deductCoins(currentBalance);

    // TODO: Actually send TON transaction to user's wallet
    // This would require backend integration with TON blockchain
    // For now, we just deduct the balance

    haptic.success();
    onSuccess();
    handleClose();
  } catch (err) {
    console.error('Cash out error:', err);
    setError('Failed to process cash out');
    haptic.error();
  } finally {
    setIsProcessing(false);
  }
};
```

**Step 4: Update button disabled logic**

Replace `isButtonDisabled` logic with:

```typescript
const isButtonDisabled = !walletAddress.trim() || isProcessing || currentBalance < 6;
```

**Step 5: Replace JSX structure**

Replace the entire `modalContent` variable (lines 135-230) with new structure:

```typescript
const modalContent = (
  <div className={styles.overlay}>
    <div className={styles.container}>
      {/* Back Button */}
      <div className={styles.backButtonRow}>
        <button
          className={styles.backButton}
          onClick={handleClose}
          disabled={isProcessing}
        >
          <ArrowLeftIcon className={styles.backIcon} />
          <span>BACK</span>
        </button>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {/* Current Balance Display */}
        <div className={styles.balanceSection}>
          <div className={styles.balanceDisplay}>
            <div className={styles.cashIconContainer}>
              <CashIcon className={styles.cashIcon} />
            </div>
            <div className={styles.balanceAmount}>{currentBalance}</div>
          </div>
          <div className={styles.balanceLabel}>Current balance</div>
        </div>

        {/* Cash Out Info Section */}
        <div className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>Cash Out</h2>
          <p className={styles.infoText}>Only winnings can be withdraw</p>
          <p className={styles.infoText}>Bonus cash is forfeited upon withdraw</p>
          <p className={styles.infoText}>$6 minimum withdraw</p>
        </div>

        {/* Wallet Address Input */}
        <div className={styles.inputSection}>
          <label className={styles.inputLabel}>Enter TON wallet address</label>
          <input
            type="text"
            className={styles.input}
            value={walletAddress}
            onChange={handleAddressChange}
            placeholder="Some numbers & letters..."
            disabled={isProcessing}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className={styles.errorMessage}>{error}</div>
        )}

        {/* Cash Out Button */}
        <div className={styles.buttonSection}>
          <button
            className={styles.cashOutButton}
            onClick={handleCashOut}
            disabled={isButtonDisabled}
          >
            <span className={styles.cashOutText}>CASH OUT</span>
            <ArrowRightIcon className={styles.cashOutArrow} />
          </button>
        </div>
      </div>
    </div>
  </div>
);
```

**Step 6: Remove unused imports**

Remove the `useTonWallet` import and `wallet` variable since we're removing the "Use Connected Wallet" feature:
- Line 3: Remove `useTonWallet` from imports
- Line 26: Remove `const wallet = useTonWallet();`
- Lines 61-67: Remove `handleUseConnectedWallet` function

**Step 7: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors (arrow icons already configured from previous task)

**Step 8: Commit**

```bash
git add src/components/CashOutModal/CashOutModal.tsx
git commit -m "refactor: simplify CashOutModal structure with new design"
```

---

## Task 2: Create Arrow Left Icon

**Files:**
- Create: `src/assets/icons/arrow-left.svg`

**Context:** Need left arrow icon for back button (24x24 size to match arrow-right).

**Step 1: Create arrow-left.svg**

Create file with content:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

**Step 2: Verify file exists**

Run: `ls -la src/assets/icons/arrow-left.svg`
Expected: File exists

**Step 3: Commit**

```bash
git add src/assets/icons/arrow-left.svg
git commit -m "feat: add arrow-left icon for back button"
```

---

## Task 3: Update CashOutModal Styles

**Files:**
- Modify: `src/components/CashOutModal/CashOutModal.module.css`

**Context:** Complete style overhaul to match new design with #171717 background, proper spacing, and component styling.

**Step 1: Replace entire CSS file**

Replace all content in `src/components/CashOutModal/CashOutModal.module.css` with:

```css
/* Overlay - Full screen dark background */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #171717;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

/* Container */
.container {
  width: 100%;
  height: 100%;
  padding-top: 20px;
  padding-bottom: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

/* Back Button Row */
.backButtonRow {
  align-self: stretch;
  padding-left: 14px;
  padding-right: 14px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 10px;
}

.backButton {
  padding: 6px 12px;
  position: relative;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: white;
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.28px;
}

.backButton::before {
  content: '';
  position: absolute;
  width: 92px;
  height: 36px;
  left: 0;
  top: 0;
  background: rgba(255, 255, 255, 0.20);
  border-radius: 50px;
  z-index: -1;
}

.backButton:active::before {
  background: rgba(255, 255, 255, 0.15);
}

.backButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.backIcon {
  width: 24px;
  height: 24px;
}

/* Main Content */
.content {
  width: 300px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  gap: 40px;
}

/* Balance Section */
.balanceSection {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  gap: 4px;
}

.balanceDisplay {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
}

.cashIconContainer {
  width: 40px;
  height: 40px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cashIcon {
  width: 32px;
  height: 32px;
  color: #0098EA;
}

.balanceAmount {
  color: white;
  font-size: 30px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  letter-spacing: 0.60px;
}

.balanceLabel {
  color: #0098EA;
  font-size: 18px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  letter-spacing: 0.36px;
  text-align: center;
}

/* Info Section */
.infoSection {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 4px;
}

.sectionTitle {
  color: white;
  font-size: 18px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  letter-spacing: 0.36px;
  margin: 0;
}

.infoText {
  color: #9F9F9F;
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  font-weight: 400;
  letter-spacing: 0.28px;
  margin: 0;
}

/* Input Section */
.inputSection {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 4px;
}

.inputLabel {
  color: #9F9F9F;
  font-size: 12px;
  font-family: 'Roboto', sans-serif;
  font-weight: 400;
  letter-spacing: 0.24px;
}

.input {
  align-self: stretch;
  padding: 6px;
  background: #252525;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  font-weight: 400;
  letter-spacing: 0.28px;
  min-height: 28px;
}

.input::placeholder {
  color: #3D3D3D;
}

.input:focus {
  outline: none;
  background: #2A2A2A;
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Error Message */
.errorMessage {
  align-self: stretch;
  background: rgba(255, 77, 0, 0.1);
  border: 1px solid rgba(255, 77, 0, 0.3);
  border-radius: 8px;
  padding: 12px;
  color: #FF4D00;
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  font-weight: 400;
  letter-spacing: 0.28px;
  text-align: center;
}

/* Button Section */
.buttonSection {
  align-self: stretch;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.cashOutButton {
  width: 300px;
  height: 44px;
  padding: 10px 20px;
  position: relative;
  background: #FF4D00;
  border: none;
  border-radius: 50px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cashOutButton:active {
  transform: scale(0.98);
  background: #E64400;
}

.cashOutButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cashOutText {
  color: white;
  font-size: 16px;
  font-family: 'Roboto', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.32px;
}

.cashOutArrow {
  width: 24px;
  height: 24px;
  color: white;
}
```

**Step 2: Verify no syntax errors**

Run: `npm run build`
Expected: Build succeeds with no CSS errors

**Step 3: Commit**

```bash
git add src/components/CashOutModal/CashOutModal.module.css
git commit -m "style: update CashOutModal with new design specs"
```

---

## Task 4: Test the Updated CashOutModal

**Context:** Verify the modal works correctly with new design, back button functions, validation works, and cash out processes successfully.

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts successfully on http://localhost:5173

**Step 2: Test modal opening**

- Navigate to profile page
- Click "CASH OUT YOUR WINNINGS" button
- Expected: Modal opens with dark #171717 background

**Step 3: Test visual elements**

Verify:
- ✓ Back button with left arrow icon visible (top-left)
- ✓ Cash icon (40x40, blue #0098EA) next to balance number
- ✓ Balance displays current coins (white, 30px font)
- ✓ "Current balance" label (blue #0098EA, 18px)
- ✓ "Cash Out" section title (white, 18px, bold)
- ✓ Three info lines in gray (#9F9F9F, 14px)
- ✓ Wallet address input field (dark #252525 background)
- ✓ Orange cash out button (#FF4D00) at bottom
- ✓ Right arrow icon on cash out button

**Step 4: Test back button**

- Click back button
- Expected: Modal closes, returns to profile page

**Step 5: Test validation**

- Open modal again
- Try to cash out without entering wallet address
- Expected: Error message "Please enter a wallet address" appears
- Enter invalid wallet address (e.g., "invalid")
- Click cash out
- Expected: Error message "Invalid TON wallet address" appears

**Step 6: Test minimum withdraw validation**

- If balance < $6:
  - Expected: Error message "$6 minimum withdraw" when trying to cash out
- If balance >= $6:
  - Enter valid wallet address
  - Expected: Cash out button becomes enabled

**Step 7: Test successful cash out**

- Set balance >= $6 (modify user data if needed)
- Enter valid TON wallet address (e.g., copy from connected wallet if available)
- Click "CASH OUT" button
- Expected:
  - Button shows processing state
  - Success: Modal closes, balance updates on profile page
  - Haptic feedback occurs

**Step 8: Test responsive behavior**

- Resize browser window
- Expected: Modal remains centered, button stays at bottom

**Step 9: Commit verification results**

```bash
# All tests passed, ready for production
git add -A
git commit -m "test: verify CashOutModal redesign functionality"
```

---

## Execution Complete

After Task 4, all changes will be implemented and tested. The CashOutModal will match the new design specifications with:
- Simplified UI (removed amount input and percentage buttons)
- Back button with arrow icon
- Large balance display with cash icon
- Clear informational text
- Single wallet address input
- Orange primary action button
- Proper validation and error handling
