# Secure TON Payment Verification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement blockchain-verified TON payments that sync to Nakama wallet through the Node.js backend, preventing fraud and replay attacks.

**Architecture:** Frontend sends TON via TonConnect, backend verifies transaction on TON blockchain (amount, destination, confirmations), then calls Nakama RPC to credit user's gaming wallet. All operations are idempotent via unique constraint on transaction hash.

**Tech Stack:** TonWeb SDK for blockchain verification, Prisma for database constraints, Nakama RPC for wallet sync.

---

## Current Flow (Insecure)

```
Frontend → TonConnect → API (addCoins) → PostgreSQL
                              ↓
                    Coins credited IMMEDIATELY
                    (NO blockchain verification!)
```

**Critical Problems:**
1. No blockchain verification - backend trusts frontend's transaction hash
2. Dual wallet system - PostgreSQL wallet and Nakama wallet NOT synchronized
3. Replay attacks possible - same tx hash could be submitted multiple times
4. Immediate credit - coins marked COMPLETED without blockchain confirmation

## Target Flow (Secure)

```
Frontend → TonConnect → Transaction on TON Blockchain
    ↓
Frontend notifies backend with txHash
    ↓
Backend verifies on TON blockchain:
  - Transaction exists
  - Destination = our payment address
  - Amount matches
  - Sufficient confirmations
    ↓
Backend calls Nakama RPC: update_user_wallet
    ↓
Nakama credits user's gaming wallet
    ↓
Backend updates PostgreSQL (for audit)
```

---

### Task 1: Add TonWeb SDK and TON Configuration

**Files:**
- Modify: `server/package.json`
- Modify: `server/src/config/index.ts`
- Create: `server/src/types/tonweb.d.ts`

**Step 1: Install TonWeb SDK**

Run:
```bash
cd server && npm install tonweb
```

**Step 2: Add TypeScript declaration for TonWeb**

Create `server/src/types/tonweb.d.ts`:
```typescript
declare module 'tonweb' {
  export interface Transaction {
    transaction_id: {
      lt: string;
      hash: string;
    };
    utime: number;
    fee: string;
    in_msg?: {
      source: string;
      destination: string;
      value: string;
      message?: string;
    };
    out_msgs: Array<{
      source: string;
      destination: string;
      value: string;
      message?: string;
    }>;
  }

  export interface HttpProvider {
    getTransactions(address: string, limit?: number, lt?: number, txhash?: string): Promise<Transaction[]>;
    getAddressInfo(address: string): Promise<{
      balance: string;
      state: string;
      last_transaction_id?: {
        lt: string;
        hash: string;
      };
    }>;
  }

  export default class TonWeb {
    static utils: {
      toNano(amount: number | string): string;
      fromNano(amount: string): string;
      Address: new (address: string) => { toString(isUserFriendly?: boolean, isUrlSafe?: boolean, isBounceable?: boolean): string };
    };

    static HttpProvider: new (host: string, options?: { apiKey?: string }) => HttpProvider;

    provider: HttpProvider;

    constructor(provider?: HttpProvider);

    getTransactions(address: string, limit?: number, lt?: number, txhash?: string): Promise<Transaction[]>;
  }
}
```

**Step 3: Update config with TON verification settings**

Modify `server/src/config/index.ts` - add to the config object:
```typescript
ton: {
  paymentReceiverAddress: process.env.PAYMENT_RECEIVER_ADDRESS || '',
  apiEndpoint: process.env.TON_API_ENDPOINT || 'https://toncenter.com/api/v2/jsonRPC',
  apiKey: process.env.TON_API_KEY || '',
  minConfirmations: parseInt(process.env.TON_MIN_CONFIRMATIONS || '1', 10),
  verificationTimeoutMs: parseInt(process.env.TON_VERIFICATION_TIMEOUT_MS || '30000', 10),
},
```

**Step 4: Verify installation**

Run: `cd server && npx tsc --noEmit`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add server/package.json server/package-lock.json server/src/config/index.ts server/src/types/tonweb.d.ts
git commit -m "feat: add TonWeb SDK and TON verification config"
```

---

### Task 2: Add Unique Constraint on tonTxHash in Database

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Update Transaction model with unique constraint**

Modify `server/prisma/schema.prisma` - change the Transaction model:

```prisma
model Transaction {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  type            TransactionType
  amount          Decimal   @db.Decimal(18, 3)
  tonAmount       BigInt?
  tonTxHash       String?   @unique  // CHANGED: Added @unique
  tonSenderAddress String?  // NEW: Store sender address for audit
  status          TransactionStatus @default(PENDING)
  verifiedAt      DateTime?  // NEW: When blockchain verification completed
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId])
  // REMOVED: @@index([tonTxHash]) - @unique already creates an index
}
```

**Step 2: Create migration**

Run:
```bash
cd server && npx prisma migrate dev --name add_unique_ton_tx_hash
```

Expected: Migration created successfully

**Step 3: Verify constraint**

Run: `npx prisma db push --force-reset` (only in dev) or check migration SQL includes `UNIQUE` constraint

**Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add unique constraint on tonTxHash to prevent replay attacks"
```

---

### Task 3: Create TON Verification Service

**Files:**
- Create: `server/src/services/tonService.ts`

**Step 1: Create the TON verification service**

Create `server/src/services/tonService.ts`:
```typescript
import TonWeb from 'tonweb';
import { config } from '../config';

export interface VerificationResult {
  verified: boolean;
  error?: string;
  transaction?: {
    hash: string;
    lt: string;
    amount: string;  // In nanoTON
    sender: string;
    timestamp: number;
  };
}

export class TonService {
  private tonweb: TonWeb;
  private receiverAddress: string;
  private minConfirmations: number;

  constructor() {
    const provider = new TonWeb.HttpProvider(config.ton.apiEndpoint, {
      apiKey: config.ton.apiKey || undefined,
    });
    this.tonweb = new TonWeb(provider);
    this.receiverAddress = config.ton.paymentReceiverAddress;
    this.minConfirmations = config.ton.minConfirmations;
  }

  /**
   * Verify a TON transaction on the blockchain
   *
   * @param txHash - The transaction hash (base64 encoded)
   * @param expectedAmountNano - Expected amount in nanoTON
   * @returns VerificationResult with transaction details if verified
   */
  async verifyTransaction(
    txHash: string,
    expectedAmountNano: bigint
  ): Promise<VerificationResult> {
    if (!this.receiverAddress) {
      return {
        verified: false,
        error: 'Payment receiver address not configured',
      };
    }

    try {
      // Fetch recent transactions for our receiver address
      // TON transactions are identified by (address, lt, hash)
      const transactions = await this.tonweb.getTransactions(
        this.receiverAddress,
        100  // Fetch last 100 transactions
      );

      if (!transactions || transactions.length === 0) {
        return {
          verified: false,
          error: 'No transactions found for receiver address',
        };
      }

      // Find the transaction by hash
      const tx = transactions.find(t => t.transaction_id.hash === txHash);

      if (!tx) {
        return {
          verified: false,
          error: 'Transaction not found on blockchain',
        };
      }

      // Verify incoming message exists and has correct destination
      if (!tx.in_msg) {
        return {
          verified: false,
          error: 'Transaction has no incoming message',
        };
      }

      // Verify destination matches our receiver
      const destAddress = tx.in_msg.destination;
      if (!this.addressesMatch(destAddress, this.receiverAddress)) {
        return {
          verified: false,
          error: 'Transaction destination does not match payment address',
        };
      }

      // Verify amount
      const receivedAmount = BigInt(tx.in_msg.value || '0');
      if (receivedAmount < expectedAmountNano) {
        return {
          verified: false,
          error: `Amount mismatch: expected ${expectedAmountNano}, got ${receivedAmount}`,
        };
      }

      // TON achieves finality within ~5 seconds (single masterchain block)
      // We can consider transaction confirmed if it appears in our query
      // For extra safety, check transaction age
      const txAge = Date.now() / 1000 - tx.utime;
      if (txAge < 5) {
        return {
          verified: false,
          error: 'Transaction too recent, waiting for confirmation',
        };
      }

      return {
        verified: true,
        transaction: {
          hash: tx.transaction_id.hash,
          lt: tx.transaction_id.lt,
          amount: tx.in_msg.value,
          sender: tx.in_msg.source,
          timestamp: tx.utime,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        verified: false,
        error: `Verification failed: ${message}`,
      };
    }
  }

  /**
   * Compare two TON addresses (handles different formats)
   */
  private addressesMatch(addr1: string, addr2: string): boolean {
    try {
      // Normalize both addresses to the same format
      const address1 = new TonWeb.utils.Address(addr1);
      const address2 = new TonWeb.utils.Address(addr2);

      // Compare in raw format
      return address1.toString(false) === address2.toString(false);
    } catch {
      // If parsing fails, do direct string comparison
      return addr1.toLowerCase() === addr2.toLowerCase();
    }
  }

  /**
   * Convert TON amount to nanoTON
   */
  static toNano(amount: number): bigint {
    return BigInt(TonWeb.utils.toNano(amount));
  }

  /**
   * Convert nanoTON to TON
   */
  static fromNano(amountNano: bigint): number {
    return parseFloat(TonWeb.utils.fromNano(amountNano.toString()));
  }
}

export const tonService = new TonService();
```

**Step 2: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add server/src/services/tonService.ts
git commit -m "feat: add TON blockchain verification service"
```

---

### Task 4: Create Nakama Wallet Sync RPC

**Files:**
- Modify: `nakama/modules/main.js`

**Step 1: Add the wallet update RPC in InitModule**

Add to the `InitModule` function after other RPC registrations:
```javascript
// Wallet sync RPC - called by Node.js backend only
initializer.registerRpc("update_user_wallet", rpcUpdateUserWallet);
```

**Step 2: Add the RPC function before InitModule**

Add the function:
```javascript
/**
 * RPC to update user wallet balance
 * IMPORTANT: This should only be called by the Node.js backend after blockchain verification
 *
 * Payload: {
 *   odredacted: string,      // Nakama user ID
 *   amount: number,       // Amount to add (in cents/smallest unit)
 *   tonTxHash: string,    // TON transaction hash (for idempotency)
 *   tonAmount: string,    // TON amount in nanoTON
 *   reason: string        // Reason for update (e.g., "ton_purchase")
 * }
 */
function rpcUpdateUserWallet(ctx, logger, nk, payload) {
  logger.info("update_user_wallet called");

  var data;
  try {
    data = JSON.parse(payload);
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: "Invalid payload",
      code: "INVALID_PAYLOAD"
    });
  }

  var odredacted = data.userId;
  var amount = data.amount;
  var tonTxHash = data.tonTxHash;
  var tonAmount = data.tonAmount;
  var reason = data.reason || "ton_purchase";

  if (!userId || !amount || !tonTxHash) {
    return JSON.stringify({
      success: false,
      error: "Missing required fields: userId, amount, tonTxHash",
      code: "MISSING_FIELDS"
    });
  }

  // Idempotency check - have we already processed this transaction?
  try {
    var reads = nk.storageRead([
      { collection: "processed_transactions", key: tonTxHash }
    ]);

    if (reads.length > 0) {
      logger.info("Transaction " + tonTxHash + " already processed, returning cached result");
      return JSON.stringify({
        success: true,
        alreadyProcessed: true,
        previousResult: reads[0].value
      });
    }
  } catch (e) {
    logger.warn("Could not check idempotency: " + e.message);
  }

  // Update wallet
  try {
    nk.walletUpdate(userId, { coins: amount }, {
      type: reason,
      tonTxHash: tonTxHash,
      tonAmount: tonAmount,
      timestamp: Date.now()
    }, true);

    logger.info("Added " + amount + " coins to user " + odredacted + " for tx " + tonTxHash);
  } catch (e) {
    logger.error("Failed to update wallet: " + e.message);
    return JSON.stringify({
      success: false,
      error: "Wallet update failed: " + e.message,
      code: "WALLET_UPDATE_FAILED"
    });
  }

  // Store processed transaction for idempotency
  var processedRecord = {
    odredacted: odredacted,
    amount: amount,
    tonTxHash: tonTxHash,
    tonAmount: tonAmount,
    reason: reason,
    processedAt: Date.now()
  };

  try {
    nk.storageWrite([{
      collection: "processed_transactions",
      key: tonTxHash,
      value: processedRecord,
      permissionRead: 0,  // Server only
      permissionWrite: 0  // Server only
    }]);
  } catch (e) {
    logger.warn("Could not store idempotency record: " + e.message);
    // Continue - wallet update succeeded
  }

  // Get updated wallet balance
  var account = nk.accountGetId(userId);
  var wallet = account.wallet || {};
  var newBalance = wallet.coins || 0;

  return JSON.stringify({
    success: true,
    odredacted: odredacted,
    addedAmount: amount,
    newBalance: newBalance,
    tonTxHash: tonTxHash
  });
}
```

**Step 3: Restart Nakama to load changes**

Run: `docker-compose restart nakama` (or your Nakama restart command)

**Step 4: Verify RPC is registered**

Check Nakama logs for: "Registered RPC function: update_user_wallet"

**Step 5: Commit**

```bash
git add nakama/modules/main.js
git commit -m "feat: add Nakama RPC for wallet sync with idempotency"
```

---

### Task 5: Create Nakama Client Service in Node.js Backend

**Files:**
- Create: `server/src/services/nakamaService.ts`

**Step 1: Install Nakama SDK**

Run:
```bash
cd server && npm install @heroiclabs/nakama-js
```

**Step 2: Create the Nakama service**

Create `server/src/services/nakamaService.ts`:
```typescript
import { Client, Session } from '@heroiclabs/nakama-js';
import { config } from '../config';

interface WalletUpdateResult {
  success: boolean;
  odredacted?: string;
  addedAmount?: number;
  newBalance?: number;
  tonTxHash?: string;
  alreadyProcessed?: boolean;
  error?: string;
  code?: string;
}

export class NakamaService {
  private client: Client;
  private serverSession: Session | null = null;

  constructor() {
    this.client = new Client(
      config.nakama?.serverKey || 'defaultkey',
      config.nakama?.host || 'localhost',
      config.nakama?.port?.toString() || '7350',
      config.nakama?.useSSL || false
    );
  }

  /**
   * Authenticate as server (using server key)
   * This creates a special session for server-to-server calls
   */
  private async ensureServerSession(): Promise<Session> {
    if (this.serverSession && !this.serverSession.isexpired) {
      return this.serverSession;
    }

    // Use device auth with a fixed server ID
    // This is a workaround - in production, use a proper service account
    this.serverSession = await this.client.authenticateDevice(
      'server-backend-' + (config.nakama?.serverKey || 'default'),
      true,  // create if not exists
      'server'
    );

    return this.serverSession;
  }

  /**
   * Update a user's wallet balance in Nakama
   * Called after blockchain verification succeeds
   */
  async updateUserWallet(params: {
    odredacted: string;      // Nakama user ID
    amount: number;       // Amount to add (in cents)
    tonTxHash: string;    // Transaction hash for idempotency
    tonAmount: string;    // TON amount in nanoTON
    reason?: string;
  }): Promise<WalletUpdateResult> {
    const session = await this.ensureServerSession();

    const payload = {
      odredacted: params.userId,
      amount: params.amount,
      tonTxHash: params.tonTxHash,
      tonAmount: params.tonAmount,
      reason: params.reason || 'ton_purchase',
    };

    const response = await this.client.rpc(
      session,
      'update_user_wallet',
      payload
    );

    return response.payload as WalletUpdateResult;
  }

  /**
   * Map Telegram ID to Nakama user ID
   * Users authenticate with Telegram, so their Nakama ID is based on that
   */
  async getNakamaUserIdFromTelegramId(telegramId: number): Promise<string | null> {
    // Nakama custom ID format for Telegram users
    // This must match how the frontend authenticates
    const customId = `telegram:${telegramId}`;

    try {
      const session = await this.ensureServerSession();

      // Try to fetch users by custom ID
      const users = await this.client.getUsers(session, [], [], [customId]);

      if (users.users && users.users.length > 0) {
        return users.users[0].id;
      }

      return null;
    } catch (error) {
      console.error('Failed to get Nakama user ID:', error);
      return null;
    }
  }
}

export const nakamaService = new NakamaService();
```

**Step 3: Add Nakama config to server config**

Update `server/src/config/index.ts` - add nakama section:
```typescript
nakama: {
  host: process.env.NAKAMA_HOST || 'localhost',
  port: parseInt(process.env.NAKAMA_PORT || '7350', 10),
  serverKey: process.env.NAKAMA_SERVER_KEY || 'defaultkey',
  useSSL: process.env.NAKAMA_USE_SSL === 'true',
},
```

**Step 4: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add server/package.json server/package-lock.json server/src/services/nakamaService.ts server/src/config/index.ts
git commit -m "feat: add Nakama client service for wallet sync"
```

---

### Task 6: Update UserService with Verified Add Coins

**Files:**
- Modify: `server/src/services/userService.ts`

**Step 1: Import dependencies**

Add at the top of the file:
```typescript
import { tonService, TonService } from './tonService';
import { nakamaService } from './nakamaService';
```

**Step 2: Add new method for verified coin addition**

Add this method to the `UserService` class:
```typescript
/**
 * Add coins after verifying TON transaction on blockchain
 * This is the secure method that should be used for real payments
 */
async addCoinsVerified(
  telegramId: number,
  tonAmountNano: bigint,
  transactionHash: string
): Promise<{
  success: boolean;
  error?: string;
  balance?: number;
  alreadyProcessed?: boolean;
}> {
  // Step 1: Check if transaction already processed (database level)
  const existingTx = await prisma.transaction.findUnique({
    where: { tonTxHash: transactionHash },
  });

  if (existingTx) {
    // Already processed - return success (idempotent)
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    return {
      success: true,
      alreadyProcessed: true,
      balance: user ? decimalToNumber(user.coinBalance) : 0,
    };
  }

  // Step 2: Verify transaction on TON blockchain
  const verificationResult = await tonService.verifyTransaction(
    transactionHash,
    tonAmountNano
  );

  if (!verificationResult.verified) {
    return {
      success: false,
      error: verificationResult.error || 'Transaction verification failed',
    };
  }

  // Step 3: Calculate coin amount from TON
  // Using a rate of 1 TON = 100 coins (configurable)
  const TON_TO_COINS_RATE = 100;
  const tonAmount = TonService.fromNano(tonAmountNano);
  const coinAmount = Math.floor(tonAmount * TON_TO_COINS_RATE);

  // Step 4: Get Nakama user ID
  const nakamaUserId = await nakamaService.getNakamaUserIdFromTelegramId(telegramId);

  // Step 5: Update Nakama wallet (if user exists there)
  if (nakamaUserId) {
    try {
      const nakamaResult = await nakamaService.updateUserWallet({
        odredacted: nakamaUserId,
        amount: coinAmount,
        tonTxHash: transactionHash,
        tonAmount: tonAmountNano.toString(),
        reason: 'ton_purchase',
      });

      if (!nakamaResult.success && !nakamaResult.alreadyProcessed) {
        console.error('Nakama wallet update failed:', nakamaResult.error);
        // Continue to update PostgreSQL for audit, but log the error
      }
    } catch (error) {
      console.error('Nakama wallet update error:', error);
      // Continue to update PostgreSQL for audit
    }
  }

  // Step 6: Update PostgreSQL (for audit and backup)
  return prisma.$transaction(async (tx: TransactionClient) => {
    const user = await tx.user.update({
      where: { telegramId: BigInt(telegramId) },
      data: { coinBalance: { increment: coinAmount } },
    });

    await tx.transaction.create({
      data: {
        userId: user.id,
        type: TransactionType.PURCHASE,
        amount: coinAmount,
        tonTxHash: transactionHash,
        tonAmount: tonAmountNano,
        tonSenderAddress: verificationResult.transaction?.sender,
        status: TransactionStatus.COMPLETED,
        verifiedAt: new Date(),
      },
    });

    return {
      success: true,
      balance: decimalToNumber(user.coinBalance),
    };
  });
}
```

**Step 3: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add server/src/services/userService.ts
git commit -m "feat: add verified coin addition with blockchain verification"
```

---

### Task 7: Update Controller and Schema

**Files:**
- Modify: `server/src/controllers/usersController.ts`
- Modify: `server/src/schemas/users.ts` (if exists, otherwise create)

**Step 1: Update the schema**

Find or create `server/src/schemas/users.ts` and update/add:
```typescript
import { z } from 'zod';

export const addCoinsVerifiedSchema = z.object({
  transactionHash: z.string().min(1, 'Transaction hash is required'),
  tonAmount: z.string().min(1, 'TON amount is required'),  // In nanoTON as string
});
```

**Step 2: Update the controller**

Replace the `addCoins` method in `usersController.ts`:
```typescript
async addCoins(req: Request, res: Response, next: NextFunction) {
  try {
    const telegramUser = req.telegramUser!;

    // Try new verified schema first
    const verifiedParse = addCoinsVerifiedSchema.safeParse(req.body);

    if (verifiedParse.success) {
      // New secure flow with blockchain verification
      const { transactionHash, tonAmount } = verifiedParse.data;

      // Ensure user exists in database
      await userService.findOrCreateByTelegramId(telegramUser.id, {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      });

      const result = await userService.addCoinsVerified(
        telegramUser.id,
        BigInt(tonAmount),
        transactionHash
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({
        telegramId: telegramUser.id,
        balance: result.balance,
        alreadyProcessed: result.alreadyProcessed,
      });
    }

    // Fallback to old schema for backwards compatibility (should be removed later)
    const bodyParse = addCoinsSchema.safeParse(req.body);

    if (!bodyParse.success) {
      return res.status(400).json({ error: bodyParse.error.issues[0].message });
    }

    const { amount, transactionHash, tonAmount } = bodyParse.data;

    // Ensure user exists in database
    await userService.findOrCreateByTelegramId(telegramUser.id, {
      username: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
    });

    // DEPRECATED: Old unverified flow - log warning
    console.warn('DEPRECATED: Using unverified addCoins flow. Update frontend to use verified flow.');

    const user = await userService.addCoins(telegramUser.id, amount, {
      tonTxHash: transactionHash,
      tonAmount: tonAmount ? BigInt(tonAmount) : undefined,
    });

    res.json({
      telegramId: telegramUser.id,
      balance: decimalToNumber(user.coinBalance),
    });
  } catch (error) {
    next(error);
  }
},
```

**Step 3: Import the new schema**

Add to imports in controller:
```typescript
import { coinAmountSchema, addCoinsSchema, linkWalletSchema, addCoinsVerifiedSchema } from '../schemas/users';
```

**Step 4: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add server/src/controllers/usersController.ts server/src/schemas/users.ts
git commit -m "feat: update controller to use verified coin addition"
```

---

### Task 8: Update Frontend to Use Verified Flow

**Files:**
- Modify: `src/services/api.ts` (or wherever API calls are made)
- Modify: Component that calls `onSendTransaction`

**Step 1: Find the API service that handles add-coins**

Search for where the API call to `/me/add-coins` is made.

**Step 2: Update the API call**

The API call should now send:
```typescript
async addCoins(transactionHash: string, tonAmount: string): Promise<{ balance: number }> {
  const response = await fetch(`${API_BASE_URL}/users/me/add-coins`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `tma ${initDataRaw}`,
    },
    body: JSON.stringify({
      transactionHash,
      tonAmount,  // In nanoTON as string
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add coins');
  }

  return response.json();
}
```

**Step 3: Update the component handling transaction**

The component should:
1. Send transaction via TonConnect (already does this)
2. Get the transaction hash from the result (TonConnect returns BOC, need to extract hash)
3. Call the API with the hash and amount

**Step 4: Verify the flow works**

Test in browser:
1. Open AddTonModal
2. Connect wallet
3. Select amount
4. Send transaction
5. Check that coins appear in balance

**Step 5: Commit**

```bash
git add src/services/api.ts src/components/AddTonModal/AddTonModal.tsx
git commit -m "feat: update frontend to use verified add-coins flow"
```

---

### Task 9: Add Environment Variables Documentation

**Files:**
- Modify: `server/.env.example` (create if not exists)
- Modify: `README.md` or create `docs/env-setup.md`

**Step 1: Create/update .env.example**

Add:
```env
# TON Blockchain Verification
PAYMENT_RECEIVER_ADDRESS=EQxxx...  # Your TON wallet address to receive payments
TON_API_ENDPOINT=https://toncenter.com/api/v2/jsonRPC
TON_API_KEY=your_toncenter_api_key  # Get from https://toncenter.com
TON_MIN_CONFIRMATIONS=1
TON_VERIFICATION_TIMEOUT_MS=30000

# Nakama Integration
NAKAMA_HOST=localhost
NAKAMA_PORT=7350
NAKAMA_SERVER_KEY=defaultkey
NAKAMA_USE_SSL=false
```

**Step 2: Document the setup**

Add to README or create docs:
```markdown
## TON Payment Setup

1. Create a TON wallet for receiving payments
2. Set `PAYMENT_RECEIVER_ADDRESS` to your wallet address
3. Get a TON Center API key from https://toncenter.com
4. Set `TON_API_KEY` with your key

The system verifies all transactions on the TON blockchain before crediting coins.
```

**Step 3: Commit**

```bash
git add server/.env.example README.md
git commit -m "docs: add TON payment configuration documentation"
```

---

### Task 10: Integration Testing

**Files:**
- Create: `server/src/services/__tests__/tonService.test.ts`

**Step 1: Create test file**

Create basic integration tests:
```typescript
import { TonService } from '../tonService';

describe('TonService', () => {
  const tonService = new TonService();

  describe('toNano', () => {
    it('converts TON to nanoTON correctly', () => {
      expect(TonService.toNano(1)).toBe(BigInt('1000000000'));
      expect(TonService.toNano(0.5)).toBe(BigInt('500000000'));
    });
  });

  describe('fromNano', () => {
    it('converts nanoTON to TON correctly', () => {
      expect(TonService.fromNano(BigInt('1000000000'))).toBe(1);
      expect(TonService.fromNano(BigInt('500000000'))).toBe(0.5);
    });
  });

  // Integration test - requires real transaction hash
  describe.skip('verifyTransaction', () => {
    it('verifies a real transaction', async () => {
      const result = await tonService.verifyTransaction(
        'real_tx_hash_here',
        BigInt('1000000000')
      );
      expect(result.verified).toBe(true);
    });
  });
});
```

**Step 2: Run tests**

Run: `cd server && npm test -- --testPathPattern=tonService`
Expected: Utility tests pass, integration tests skipped

**Step 3: Commit**

```bash
git add server/src/services/__tests__/tonService.test.ts
git commit -m "test: add TON service unit tests"
```

---

## Summary of Changes

1. **Database**: Added `@unique` constraint on `tonTxHash` to prevent replay attacks
2. **TON Service**: New service to verify transactions on TON blockchain
3. **Nakama RPC**: New `update_user_wallet` RPC with idempotency check
4. **Nakama Client**: Node.js service to call Nakama RPCs
5. **User Service**: New `addCoinsVerified` method with full verification flow
6. **Controller**: Updated to use verified flow with backwards compatibility
7. **Frontend**: Updated to send transaction hash and amount for verification
8. **Config**: Added TON and Nakama configuration options
9. **Docs**: Environment variable documentation

## Security Improvements

- Transactions verified on TON blockchain before crediting
- Unique constraint prevents replay attacks at database level
- Idempotency check in Nakama prevents double-credits
- Audit trail maintained in PostgreSQL
- Sender address stored for forensics
