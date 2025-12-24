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
