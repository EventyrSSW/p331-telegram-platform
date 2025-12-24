# Fix Decimal TON Transaction Bug

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the error when submitting decimal TON amounts (e.g., 0.1 TON) in AddTonModal

**Architecture:** Store coins as milliCoins internally (1 Coin = 1000 milliCoins) to handle decimals while keeping Int in database. Frontend converts for display.

**Tech Stack:** Prisma, Zod, React, TypeScript

---

## Root Cause Analysis

**Current Flow:**
1. User enters `0.1` TON in AddTonModal
2. Frontend sends `amount: 0.1` to `POST /api/users/me/add-coins`
3. Backend Zod schema rejects: `.int('Amount must be a whole number')`
4. Error thrown, generic alert shown: "Failed to send TON. Please try again."

**Issues:**
- `server/src/schemas/users.ts:11` - `.int()` validation rejects decimals
- `server/prisma/schema.prisma:23` - `coinBalance Int` can't store decimals
- `server/prisma/schema.prisma:39` - `Transaction.amount Int` can't store decimals
- `src/components/Header/Header.tsx:82` - Generic error message, no details

---

### Task 1: Update Zod Schema to Accept Decimals

**Files:**
- Modify: `server/src/schemas/users.ts`

**Step 1: Update coinAmountSchema to allow decimals**

```typescript
export const coinAmountSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .max(1_000_000, 'Amount too large')
    .refine(val => {
      // Allow up to 3 decimal places (milliCoins precision)
      const decimalPlaces = (val.toString().split('.')[1] || '').length;
      return decimalPlaces <= 3;
    }, 'Maximum 3 decimal places allowed'),
});
```

**Step 2: Verify file saved**

Run: `cat server/src/schemas/users.ts`

---

### Task 2: Update Database Schema to Use BigInt for MilliCoins

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Change coinBalance and amount to BigInt**

In `model User`:
```prisma
coinBalance     BigInt    @default(0)  // Stored as milliCoins (1 coin = 1000 milliCoins)
```

In `model Transaction`:
```prisma
amount          BigInt    // Stored as milliCoins
```

**Step 2: Generate migration**

Run: `cd server && npx prisma migrate dev --name millicoins-precision`

---

### Task 3: Update UserService to Convert to MilliCoins

**Files:**
- Modify: `server/src/services/userService.ts`

**Step 1: Add conversion constant and helper**

At the top of the file, add:
```typescript
const MILLICOINS_PER_COIN = 1000n;

function toMilliCoins(coins: number): bigint {
  return BigInt(Math.round(coins * 1000));
}

function fromMilliCoins(milliCoins: bigint): number {
  return Number(milliCoins) / 1000;
}
```

**Step 2: Update addCoins method**

```typescript
async addCoins(
  telegramId: number,
  amount: number,
  options?: {
    tonTxHash?: string;
    tonAmount?: bigint;
  }
) {
  const milliCoins = toMilliCoins(amount);

  return prisma.$transaction(async (tx: TransactionClient) => {
    // Update user balance
    const user = await tx.user.update({
      where: { telegramId: BigInt(telegramId) },
      data: { coinBalance: { increment: milliCoins } },
    });

    // Create transaction record
    await tx.transaction.create({
      data: {
        userId: user.id,
        type: TransactionType.PURCHASE,
        amount: milliCoins,
        tonTxHash: options?.tonTxHash,
        tonAmount: options?.tonAmount,
        status: TransactionStatus.COMPLETED,
      },
    });

    return user;
  });
}
```

**Step 3: Update deductCoins similarly**

```typescript
async deductCoins(telegramId: number, amount: number) {
  const milliCoins = toMilliCoins(amount);

  return prisma.$transaction(async (tx: TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    if (!user || user.coinBalance < milliCoins) {
      throw new Error('Insufficient balance');
    }

    const updated = await tx.user.update({
      where: { telegramId: BigInt(telegramId) },
      data: { coinBalance: { decrement: milliCoins } },
    });

    await tx.transaction.create({
      data: {
        userId: updated.id,
        type: TransactionType.GAME_SPEND,
        amount: -milliCoins,
        status: TransactionStatus.COMPLETED,
      },
    });

    return updated;
  });
}
```

---

### Task 4: Update API Responses to Convert Back to Coins

**Files:**
- Modify: `server/src/controllers/usersController.ts`

**Step 1: Add fromMilliCoins helper import or inline**

```typescript
function fromMilliCoins(milliCoins: bigint): number {
  return Number(milliCoins) / 1000;
}
```

**Step 2: Update getBalance response**

```typescript
async getBalance(req: Request, res: Response, next: NextFunction) {
  try {
    const telegramUser = req.telegramUser!;
    const user = await userService.findOrCreateUser({...});

    res.json({
      telegramId: telegramUser.id,
      walletAddress: user.walletAddress,
      balance: fromMilliCoins(user.coinBalance), // Convert to display coins
    });
  } catch (error) {
    next(error);
  }
},
```

**Step 3: Update addCoins response**

```typescript
async addCoins(req: Request, res: Response, next: NextFunction) {
  // ... existing validation ...

  const user = await userService.addCoins(telegramUser.id, amount, {...});

  res.json({
    telegramId: telegramUser.id,
    walletAddress: user.walletAddress,
    balance: fromMilliCoins(user.coinBalance), // Convert to display coins
  });
},
```

**Step 4: Update deductCoins and getProfile similarly**

---

### Task 5: Improve Error Messages in Frontend

**Files:**
- Modify: `src/components/Header/Header.tsx`

**Step 1: Add detailed error logging and user-friendly messages**

```typescript
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

    if (error.message.includes('cancelled')) {
      errorMessage = 'Transaction cancelled.';
    } else if (error.message.includes('Amount')) {
      errorMessage = error.message; // Show validation errors
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = 'Network error. Please check your connection.';
    }
  }

  alert(errorMessage);
  throw error;
}
```

---

### Task 6: Update Frontend Display for Decimal Balances

**Files:**
- Modify: `src/components/Header/Header.tsx`
- Modify: `src/components/AddTonModal/AddTonModal.tsx`

**Step 1: Update formatBalance in Header.tsx**

```typescript
const formatBalance = (balance: number): string => {
  if (balance >= 1000000) {
    return `${(balance / 1000000).toFixed(1)}M`;
  }
  if (balance >= 1000) {
    return `${(balance / 1000).toFixed(1)}K`;
  }
  // Show decimals for small amounts
  if (balance < 10 && balance % 1 !== 0) {
    return balance.toFixed(2);
  }
  return balance.toLocaleString();
};
```

**Step 2: Update AddTonModal balance display**

Already shows `.toFixed(2)` - verify it works with new values.

---

### Task 7: Test the Fix

**Step 1: Build and run server**

Run: `cd server && npm run build && npm run dev`

**Step 2: Test decimal transaction**

```bash
# Test adding 0.1 coins (should work now)
curl -X POST http://localhost:3001/api/users/me/add-coins \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"amount": 0.1, "transactionHash": "test"}'
```

**Expected:** `{"telegramId":..., "balance": 0.1, ...}`

**Step 3: Test in app**

1. Open app in Telegram
2. Open AddTonModal
3. Enter 0.5 TON
4. Confirm transaction
5. Verify balance updates correctly

---

### Task 8: Commit and Push

**Step 1: Stage and commit**

```bash
git add -A
git commit -m "fix: support decimal TON amounts in transactions

- Update Zod schema to allow decimals (max 3 places)
- Store coins as milliCoins (BigInt) for precision
- Convert to/from display format in API responses
- Improve error messages in AddTonModal

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Step 2: Push**

```bash
git push
```
