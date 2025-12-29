# Fix Leading Zeros Input Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent users from entering multiple leading zeros in TON token amount input (e.g., "000001", "00.1") while allowing legitimate numbers with trailing zeros (e.g., "10000", "1.00").

**Architecture:** Add input validation logic to the `handleNumpadClick` function in AddTonModal component to detect and block invalid leading zero patterns. The validation will check if the new input would create multiple leading zeros and reject it, while preserving existing behavior for valid inputs.

**Tech Stack:** React, TypeScript, Vite

**Current Behavior Issue:**
- Users can input "000001" which displays as "0.000001" or similar confusing patterns
- Users can input "00.1" which is visually confusing
- The current logic only replaces a single "0" with the first non-zero digit (line 68)

**Desired Behavior:**
- Allow: "0", "0.1", "0.25", "1", "10", "100", "10000", "1.00"
- Block: "00", "000", "00.1", "000001", "00.25"
- One leading zero is acceptable only before a decimal point or when the value is exactly "0"

---

## Task 1: Set Up Testing Infrastructure

**Files:**
- Create: `src/components/AddTonModal/__tests__/AddTonModal.test.tsx`
- Create: `vitest.config.ts`
- Modify: `package.json`

**Step 1: Install testing dependencies**

Run:
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/ui
```

Expected: Dependencies installed successfully

**Step 2: Create Vitest configuration**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Step 3: Create test setup file**

Create `src/test/setup.ts`:

```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

**Step 4: Add test script to package.json**

Modify `package.json` scripts section:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:run": "vitest run",
  "dev:server": "cd server && npm run dev",
  "dev:all": "concurrently \"npm run dev\" \"npm run dev:server\"",
  "dev:ngrok": "./scripts/dev-with-ngrok.sh",
  "build:server": "cd server && npm run build"
}
```

**Step 5: Verify test setup**

Run: `npm test -- --version`
Expected: Vitest version displayed

**Step 6: Commit test infrastructure**

```bash
git add package.json package-lock.json vitest.config.ts src/test/setup.ts
git commit -m "test: set up Vitest and React Testing Library"
```

---

## Task 2: Write Failing Tests for Leading Zero Validation

**Files:**
- Create: `src/components/AddTonModal/__tests__/AddTonModal.test.tsx`

**Step 1: Create test file with basic setup**

Create `src/components/AddTonModal/__tests__/AddTonModal.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddTonModal } from '../AddTonModal';

describe('AddTonModal - Leading Zeros Validation', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    currentBalance: 100,
    isWalletConnected: true,
    onConnectWallet: vi.fn(),
    onSendTransaction: vi.fn(),
    isProcessing: false,
  };

  const getAmountDisplay = () => {
    const display = screen.getByText(/TON$/);
    return display.textContent?.replace('TON', '').trim() || '';
  };

  it('should allow entering single zero', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    // Initial state should be "0"
    expect(getAmountDisplay()).toBe('0');
  });

  it('should prevent entering second zero after initial zero', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    // Click "0" button
    const zeroButton = screen.getByRole('button', { name: '0' });
    await user.click(zeroButton);

    // Should still be "0", not "00"
    expect(getAmountDisplay()).toBe('0');
  });

  it('should prevent entering "00.1" pattern', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    // Try to enter "00.1"
    const zeroButton = screen.getByRole('button', { name: '0' });
    const decimalButton = screen.getByRole('button', { name: '.' });
    const oneButton = screen.getByRole('button', { name: '1' });

    await user.click(zeroButton); // Should stay "0"
    expect(getAmountDisplay()).toBe('0');

    await user.click(decimalButton); // Should become "0."
    expect(getAmountDisplay()).toBe('0.');

    await user.click(oneButton); // Should become "0.1"
    expect(getAmountDisplay()).toBe('0.1');
  });

  it('should allow "0.1" pattern (one leading zero before decimal)', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const decimalButton = screen.getByRole('button', { name: '.' });
    const oneButton = screen.getByRole('button', { name: '1' });

    await user.click(decimalButton); // "0."
    await user.click(oneButton); // "0.1"

    expect(getAmountDisplay()).toBe('0.1');
  });

  it('should allow entering "10000" (trailing zeros are valid)', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const oneButton = screen.getByRole('button', { name: '1' });
    const zeroButton = screen.getByRole('button', { name: '0' });

    await user.click(oneButton); // "1"
    await user.click(zeroButton); // "10"
    await user.click(zeroButton); // "100"
    await user.click(zeroButton); // "1000"
    await user.click(zeroButton); // "10000"

    expect(getAmountDisplay()).toBe('10000');
  });

  it('should replace initial "0" with non-zero digit', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const fiveButton = screen.getByRole('button', { name: '5' });
    await user.click(fiveButton);

    // Should replace "0" with "5"
    expect(getAmountDisplay()).toBe('5');
  });

  it('should prevent "000001" pattern', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const zeroButton = screen.getByRole('button', { name: '0' });
    const oneButton = screen.getByRole('button', { name: '1' });

    await user.click(zeroButton); // "0"
    expect(getAmountDisplay()).toBe('0');

    await user.click(zeroButton); // Should stay "0"
    expect(getAmountDisplay()).toBe('0');

    await user.click(zeroButton); // Should stay "0"
    expect(getAmountDisplay()).toBe('0');

    await user.click(oneButton); // Should become "1"
    expect(getAmountDisplay()).toBe('1');
  });

  it('should allow "1.00" (trailing zeros after decimal are valid)', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const oneButton = screen.getByRole('button', { name: '1' });
    const decimalButton = screen.getByRole('button', { name: '.' });
    const zeroButton = screen.getByRole('button', { name: '0' });

    await user.click(oneButton); // "1"
    await user.click(decimalButton); // "1."
    await user.click(zeroButton); // "1.0"
    await user.click(zeroButton); // "1.00"

    expect(getAmountDisplay()).toBe('1.00');
  });

  it('should allow preset amounts to work correctly', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const preset10 = screen.getByRole('button', { name: '10 TON' });
    await user.click(preset10);

    expect(getAmountDisplay()).toBe('10');
  });

  it('should handle backspace correctly with leading zeros', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const oneButton = screen.getByRole('button', { name: '1' });
    const backspaceButton = screen.getByRole('button', { name: /backspace|delete/i });

    await user.click(oneButton); // "1"
    expect(getAmountDisplay()).toBe('1');

    await user.click(backspaceButton); // Should go back to "0"
    expect(getAmountDisplay()).toBe('0');

    await user.click(backspaceButton); // Should stay "0"
    expect(getAmountDisplay()).toBe('0');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- AddTonModal.test.tsx`

Expected: Most tests should FAIL because the leading zero validation is not yet implemented. Specifically:
- "should prevent entering second zero after initial zero" - FAIL
- "should prevent entering "00.1" pattern" - FAIL (may pass "0." step but fail overall logic)
- "should prevent "000001" pattern" - FAIL

**Step 3: Commit failing tests**

```bash
git add src/components/AddTonModal/__tests__/AddTonModal.test.tsx
git commit -m "test: add failing tests for leading zeros validation"
```

---

## Task 3: Implement Leading Zero Validation Logic

**Files:**
- Modify: `src/components/AddTonModal/AddTonModal.tsx:45-78`

**Step 1: Add validation helper function**

Add this helper function after the constants (after line 17):

```typescript
const PRESET_AMOUNTS = [10, 20, 50];
const MAX_AMOUNT = 10000;

/**
 * Checks if adding a digit would create an invalid leading zero pattern
 * Valid: "0", "0.", "0.1", "10", "100"
 * Invalid: "00", "00.", "000", "000001"
 */
const wouldCreateInvalidLeadingZeros = (currentValue: string, newDigit: string): boolean => {
  // If trying to add "0" to current "0", it's invalid (would create "00")
  if (currentValue === '0' && newDigit === '0') {
    return true;
  }

  // If current value starts with "0" followed by a digit (not a decimal point), it's invalid
  // This catches cases where someone tries to build "00.1" by typing "0" then "0" then "."
  if (currentValue.length > 1 && currentValue[0] === '0' && currentValue[1] !== '.') {
    return true;
  }

  return false;
};
```

**Step 2: Integrate validation into handleNumpadClick**

Modify the `handleNumpadClick` function (lines 45-78) to include the validation:

```typescript
const handleNumpadClick = (value: string) => {
  if (isProcessing) return;
  haptic.light();

  if (value === 'backspace') {
    setAmount(prev => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
    return;
  }

  if (value === '.') {
    setAmount(prev => {
      // Don't add decimal if already has one
      if (prev.includes('.')) return prev;
      return prev + '.';
    });
    return;
  }

  setAmount(prev => {
    // Check for invalid leading zeros BEFORE processing the digit
    if (wouldCreateInvalidLeadingZeros(prev, value)) {
      return prev; // Reject the input
    }

    // If current is just "0", replace with new digit (unless it's another 0)
    if (prev === '0' && value !== '0') return value;

    // Limit decimal places to 2
    const decimalIndex = prev.indexOf('.');
    if (decimalIndex !== -1 && prev.length - decimalIndex > 2) return prev;

    const newAmount = prev + value;
    if (Number(newAmount) > MAX_AMOUNT) return prev;
    return newAmount;
  });
};
```

**Step 3: Run tests to verify they pass**

Run: `npm test -- AddTonModal.test.tsx`

Expected: All tests should PASS, including:
- "should prevent entering second zero after initial zero" - PASS
- "should prevent entering "00.1" pattern" - PASS
- "should prevent "000001" pattern" - PASS
- All other existing behavior tests - PASS

**Step 4: Test manually in the browser**

Run: `npm run dev`

Manual test checklist:
1. Open the app and navigate to AddTonModal
2. Try to type "00" - should stay at "0"
3. Try to type "000001" - should stay at "0", then jump to "1" when "1" is pressed
4. Type "0.1" - should work correctly
5. Type "10000" - should work correctly
6. Test preset buttons - should work correctly
7. Test backspace - should work correctly

**Step 5: Commit implementation**

```bash
git add src/components/AddTonModal/AddTonModal.tsx
git commit -m "feat: add validation to prevent multiple leading zeros in TON input

- Add wouldCreateInvalidLeadingZeros helper function
- Integrate validation into handleNumpadClick
- Prevents patterns like '00', '000001', '00.1'
- Allows valid patterns like '0.1', '10000', '1.00'
- All tests passing"
```

---

## Task 4: Add Edge Case Tests

**Files:**
- Modify: `src/components/AddTonModal/__tests__/AddTonModal.test.tsx`

**Step 1: Add additional edge case tests**

Add these tests to the existing test file:

```typescript
describe('AddTonModal - Leading Zeros Edge Cases', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    currentBalance: 100,
    isWalletConnected: true,
    onConnectWallet: vi.fn(),
    onSendTransaction: vi.fn(),
    isProcessing: false,
  };

  const getAmountDisplay = () => {
    const display = screen.getByText(/TON$/);
    return display.textContent?.replace('TON', '').trim() || '';
  };

  it('should handle rapid zero clicks correctly', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const zeroButton = screen.getByRole('button', { name: '0' });

    // Click zero multiple times rapidly
    await user.click(zeroButton);
    await user.click(zeroButton);
    await user.click(zeroButton);
    await user.click(zeroButton);

    // Should stay "0"
    expect(getAmountDisplay()).toBe('0');
  });

  it('should transition correctly from "0" to decimal to digit', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const decimalButton = screen.getByRole('button', { name: '.' });
    const fiveButton = screen.getByRole('button', { name: '5' });
    const zeroButton = screen.getByRole('button', { name: '0' });

    // Start: "0"
    expect(getAmountDisplay()).toBe('0');

    // Add decimal: "0."
    await user.click(decimalButton);
    expect(getAmountDisplay()).toBe('0.');

    // Add zero after decimal: "0.0"
    await user.click(zeroButton);
    expect(getAmountDisplay()).toBe('0.0');

    // Add five: "0.05"
    await user.click(fiveButton);
    expect(getAmountDisplay()).toBe('0.05');
  });

  it('should handle preset button after attempting invalid zeros', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const zeroButton = screen.getByRole('button', { name: '0' });
    const preset20 = screen.getByRole('button', { name: '20 TON' });

    // Try to add invalid zeros
    await user.click(zeroButton);
    await user.click(zeroButton);
    expect(getAmountDisplay()).toBe('0');

    // Click preset - should override to "20"
    await user.click(preset20);
    expect(getAmountDisplay()).toBe('20');

    // Now zeros should work as trailing zeros
    await user.click(zeroButton);
    expect(getAmountDisplay()).toBe('200');
  });

  it('should maintain correct state after backspace from multi-digit number', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const oneButton = screen.getByRole('button', { name: '1' });
    const twoButton = screen.getByRole('button', { name: '2' });
    const zeroButton = screen.getByRole('button', { name: '0' });
    const backspaceButton = screen.getByRole('button', { name: /backspace|delete/i });

    // Enter "12"
    await user.click(oneButton);
    await user.click(twoButton);
    expect(getAmountDisplay()).toBe('12');

    // Backspace to "1"
    await user.click(backspaceButton);
    expect(getAmountDisplay()).toBe('1');

    // Add zero - should become "10"
    await user.click(zeroButton);
    expect(getAmountDisplay()).toBe('10');

    // Backspace twice back to "0"
    await user.click(backspaceButton);
    await user.click(backspaceButton);
    expect(getAmountDisplay()).toBe('0');

    // Try to add zero - should stay "0"
    await user.click(zeroButton);
    expect(getAmountDisplay()).toBe('0');
  });

  it('should handle alternating between digits and zeros', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const oneButton = screen.getByRole('button', { name: '1' });
    const zeroButton = screen.getByRole('button', { name: '0' });
    const twoButton = screen.getByRole('button', { name: '2' });

    await user.click(oneButton); // "1"
    expect(getAmountDisplay()).toBe('1');

    await user.click(zeroButton); // "10"
    expect(getAmountDisplay()).toBe('10');

    await user.click(twoButton); // "102"
    expect(getAmountDisplay()).toBe('102');

    await user.click(zeroButton); // "1020"
    expect(getAmountDisplay()).toBe('1020');
  });
});
```

**Step 2: Run new edge case tests**

Run: `npm test -- AddTonModal.test.tsx`

Expected: All tests including new edge cases should PASS

**Step 3: Commit edge case tests**

```bash
git add src/components/AddTonModal/__tests__/AddTonModal.test.tsx
git commit -m "test: add edge case tests for leading zero validation"
```

---

## Task 5: Update Documentation

**Files:**
- Create: `docs/validation/ton-input-validation.md`

**Step 1: Create validation documentation**

Create `docs/validation/ton-input-validation.md`:

```markdown
# TON Amount Input Validation

## Overview

The AddTonModal component includes validation to ensure users can only enter valid numeric amounts for TON token purchases.

## Leading Zero Validation

### Rules

**Allowed Patterns:**
- Single zero: `"0"`
- Decimal numbers with leading zero: `"0.1"`, `"0.25"`, `"0.99"`
- Whole numbers: `"1"`, `"10"`, `"100"`, `"10000"`
- Decimal numbers with trailing zeros: `"1.00"`, `"10.50"`

**Blocked Patterns:**
- Multiple leading zeros: `"00"`, `"000"`, `"0000"`
- Leading zeros before decimal: `"00.1"`, `"000.5"`
- Leading zeros before digits: `"000001"`, `"00123"`

### Implementation

The validation is implemented in `src/components/AddTonModal/AddTonModal.tsx` using the `wouldCreateInvalidLeadingZeros` helper function.

```typescript
const wouldCreateInvalidLeadingZeros = (currentValue: string, newDigit: string): boolean => {
  // Prevent "0" + "0" = "00"
  if (currentValue === '0' && newDigit === '0') {
    return true;
  }

  // Prevent patterns like "00" followed by more digits
  if (currentValue.length > 1 && currentValue[0] === '0' && currentValue[1] !== '.') {
    return true;
  }

  return false;
};
```

### User Experience

When a user attempts to enter an invalid pattern:
1. The input is silently rejected (stays at current value)
2. Haptic feedback still occurs (maintaining consistent interaction feel)
3. No error message is shown (prevents UI clutter for expected behavior)

### Testing

Comprehensive tests are located in `src/components/AddTonModal/__tests__/AddTonModal.test.tsx`

Run tests:
```bash
npm test -- AddTonModal.test.tsx
```

## Other Validation Rules

### Maximum Amount
- Maximum: 10,000 TON
- Enforced in `handleNumpadClick` function

### Decimal Precision
- Maximum 2 decimal places
- Examples: `"1.23"` ✓, `"1.234"` ✗

### Minimum Amount
- Minimum: greater than 0
- Transaction button disabled when amount is 0
```

**Step 2: Commit documentation**

```bash
git add docs/validation/ton-input-validation.md
git commit -m "docs: add TON input validation documentation"
```

---

## Task 6: Final Verification and Cleanup

**Files:**
- None (verification only)

**Step 1: Run complete test suite**

Run: `npm test`

Expected: All tests PASS with no errors

**Step 2: Run type checking**

Run: `npm run build`

Expected: No TypeScript errors, build succeeds

**Step 3: Manual testing checklist**

Run: `npm run dev`

Test in browser:
- [ ] Open AddTonModal
- [ ] Try typing "00" → stays at "0" ✓
- [ ] Try typing "000001" → stays at "0", then becomes "1" ✓
- [ ] Type "0.1" → works correctly ✓
- [ ] Type "0.25" → works correctly ✓
- [ ] Type "1" → works correctly ✓
- [ ] Type "10" → works correctly ✓
- [ ] Type "100" → works correctly ✓
- [ ] Type "10000" → works correctly ✓
- [ ] Type "1.00" → works correctly ✓
- [ ] Click preset "10 TON" → works correctly ✓
- [ ] Click preset "20 TON" → works correctly ✓
- [ ] Click preset "50 TON" → works correctly ✓
- [ ] Type "5", backspace, try "0" → stays at "0" ✓
- [ ] Test decimal button after "0" → becomes "0." ✓
- [ ] Test rapid clicking of "0" → stays at "0" ✓

**Step 4: Review all commits**

Run: `git log --oneline -10`

Expected commits:
1. test: set up Vitest and React Testing Library
2. test: add failing tests for leading zeros validation
3. feat: add validation to prevent multiple leading zeros in TON input
4. test: add edge case tests for leading zero validation
5. docs: add TON input validation documentation

**Step 5: Create summary of changes**

Changes made:
- ✓ Added comprehensive test infrastructure (Vitest + React Testing Library)
- ✓ Implemented `wouldCreateInvalidLeadingZeros` validation helper
- ✓ Integrated validation into `handleNumpadClick` function
- ✓ Added 14+ test cases covering valid and invalid patterns
- ✓ Added edge case tests for complex interaction scenarios
- ✓ Created documentation for validation rules
- ✓ All existing functionality preserved (presets, decimals, max amount, backspace)

---

## Summary

This plan implements input validation to prevent users from entering multiple leading zeros in TON token amounts while preserving all existing functionality. The implementation follows TDD principles with comprehensive test coverage and clear documentation.

**Key Changes:**
- Added `wouldCreateInvalidLeadingZeros` helper function
- Modified `handleNumpadClick` to validate input before processing
- 14+ test cases for validation scenarios
- Documentation of validation rules

**Files Modified:**
- `src/components/AddTonModal/AddTonModal.tsx` (validation logic)

**Files Created:**
- `vitest.config.ts` (test configuration)
- `src/test/setup.ts` (test setup)
- `src/components/AddTonModal/__tests__/AddTonModal.test.tsx` (tests)
- `docs/validation/ton-input-validation.md` (documentation)

**Total Estimated Lines Changed:** ~150 lines added, ~20 lines modified
