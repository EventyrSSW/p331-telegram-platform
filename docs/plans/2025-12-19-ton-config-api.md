# TON Configuration API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add server-managed TON configuration (receiver address, network mode) and flexible coin packages with full CRUD support for future admin panel.

**Architecture:** Create `SystemConfig` table for global settings (TON network, receiver address) and `CoinPackage` table for purchasable packages. Full CRUD API for packages. Frontend fetches config on load.

**Tech Stack:** Prisma, Express, React, TonConnect

---

## Task 1: Add Database Models

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Add SystemConfig and CoinPackage models**

Add at the end of `server/prisma/schema.prisma`:

```prisma
model SystemConfig {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}

model CoinPackage {
  id          String   @id @default(cuid())
  name        String
  coins       Int      // Number of coins user receives
  price       Float    // Price in TON
  bonus       Int      @default(0) // Bonus percentage
  sortOrder   Int      @default(0) // Display order
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Step 2: Create migration**

Run:
```bash
cd server && npx prisma migrate dev --name add_config_and_packages
```

Expected: Migration created and applied successfully.

**Step 3: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add SystemConfig and CoinPackage models"
```

---

## Task 2: Seed Default Configuration

**Files:**
- Modify: `server/prisma/seed.ts`

**Step 1: Add config and packages seeding**

Add to `server/prisma/seed.ts` after game seeding:

```typescript
// Seed system configuration
const systemConfigs = [
  { key: 'ton_network', value: 'testnet' },
  { key: 'ton_receiver_address', value: '' },
];

for (const config of systemConfigs) {
  await prisma.systemConfig.upsert({
    where: { key: config.key },
    update: {},
    create: config,
  });
}
console.log('System config seeded');

// Seed coin packages
const coinPackages = [
  { name: 'Starter', coins: 100, price: 0.01, bonus: 0, sortOrder: 1 },
  { name: 'Popular', coins: 500, price: 0.04, bonus: 25, sortOrder: 2 },
  { name: 'Value', coins: 1000, price: 0.07, bonus: 40, sortOrder: 3 },
  { name: 'Best Deal', coins: 5000, price: 0.3, bonus: 65, sortOrder: 4 },
];

for (const pkg of coinPackages) {
  const existing = await prisma.coinPackage.findFirst({
    where: { name: pkg.name },
  });
  if (!existing) {
    await prisma.coinPackage.create({ data: pkg });
  }
}
console.log('Coin packages seeded');
```

**Step 2: Run seed**

```bash
cd server && npm run prisma:seed
```

Expected: "System config seeded" and "Coin packages seeded" in output.

**Step 3: Commit**

```bash
git add server/prisma/seed.ts
git commit -m "feat: seed default config and coin packages"
```

---

## Task 3: Create Config Service

**Files:**
- Create: `server/src/services/configService.ts`

**Step 1: Create config service**

Create `server/src/services/configService.ts`:

```typescript
import { prisma } from '../db/client';

export interface TonConfig {
  network: 'mainnet' | 'testnet';
  receiverAddress: string;
}

export interface CoinPackageData {
  id: string;
  name: string;
  coins: number;
  price: number;
  bonus: number;
  sortOrder: number;
  active: boolean;
}

export interface AppConfig {
  ton: TonConfig;
  coinPackages: CoinPackageData[];
}

class ConfigService {
  private configCache: Map<string, string> = new Map();
  private configCacheTime: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute

  private async loadSystemConfig(): Promise<Map<string, string>> {
    const now = Date.now();
    if (this.configCache.size > 0 && now - this.configCacheTime < this.CACHE_TTL) {
      return this.configCache;
    }

    const configs = await prisma.systemConfig.findMany();
    this.configCache.clear();
    for (const config of configs) {
      this.configCache.set(config.key, config.value);
    }
    this.configCacheTime = now;
    return this.configCache;
  }

  async get(key: string): Promise<string | null> {
    const config = await this.loadSystemConfig();
    return config.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    this.configCache.set(key, value);
  }

  async getTonConfig(): Promise<TonConfig> {
    const config = await this.loadSystemConfig();
    return {
      network: (config.get('ton_network') as 'mainnet' | 'testnet') || 'testnet',
      receiverAddress: config.get('ton_receiver_address') || '',
    };
  }

  async getAppConfig(): Promise<AppConfig> {
    const [tonConfig, packages] = await Promise.all([
      this.getTonConfig(),
      this.getActivePackages(),
    ]);

    return {
      ton: tonConfig,
      coinPackages: packages,
    };
  }

  // Coin Package CRUD
  async getActivePackages(): Promise<CoinPackageData[]> {
    const packages = await prisma.coinPackage.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    return packages;
  }

  async getAllPackages(): Promise<CoinPackageData[]> {
    const packages = await prisma.coinPackage.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return packages;
  }

  async getPackageById(id: string): Promise<CoinPackageData | null> {
    return prisma.coinPackage.findUnique({ where: { id } });
  }

  async createPackage(data: {
    name: string;
    coins: number;
    price: number;
    bonus?: number;
    sortOrder?: number;
    active?: boolean;
  }): Promise<CoinPackageData> {
    return prisma.coinPackage.create({
      data: {
        name: data.name,
        coins: data.coins,
        price: data.price,
        bonus: data.bonus || 0,
        sortOrder: data.sortOrder || 0,
        active: data.active ?? true,
      },
    });
  }

  async updatePackage(id: string, data: {
    name?: string;
    coins?: number;
    price?: number;
    bonus?: number;
    sortOrder?: number;
    active?: boolean;
  }): Promise<CoinPackageData> {
    return prisma.coinPackage.update({
      where: { id },
      data,
    });
  }

  async deletePackage(id: string): Promise<void> {
    await prisma.coinPackage.delete({ where: { id } });
  }

  clearCache(): void {
    this.configCache.clear();
    this.configCacheTime = 0;
  }
}

export const configService = new ConfigService();
```

**Step 2: Commit**

```bash
git add server/src/services/configService.ts
git commit -m "feat: add config service with package CRUD"
```

---

## Task 4: Create Config Controller

**Files:**
- Create: `server/src/controllers/configController.ts`

**Step 1: Create controller with CRUD for packages**

Create `server/src/controllers/configController.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { configService } from '../services/configService';
import { z } from 'zod';

const updateTonConfigSchema = z.object({
  network: z.enum(['mainnet', 'testnet']).optional(),
  receiverAddress: z.string().optional(),
});

const createPackageSchema = z.object({
  name: z.string().min(1).max(50),
  coins: z.number().int().positive(),
  price: z.number().positive(),
  bonus: z.number().int().min(0).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

const updatePackageSchema = createPackageSchema.partial();

class ConfigController {
  // Public: Get app config (TON settings + active packages)
  async getAppConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await configService.getAppConfig();
      res.json(config);
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update TON config
  async updateTonConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const parse = updateTonConfigSchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({ error: parse.error.issues[0].message });
      }

      if (parse.data.network) {
        await configService.set('ton_network', parse.data.network);
      }
      if (parse.data.receiverAddress !== undefined) {
        await configService.set('ton_receiver_address', parse.data.receiverAddress);
      }

      configService.clearCache();
      const config = await configService.getAppConfig();
      res.json(config);
    } catch (error) {
      next(error);
    }
  }

  // Admin: List all packages (including inactive)
  async listPackages(req: Request, res: Response, next: NextFunction) {
    try {
      const packages = await configService.getAllPackages();
      res.json(packages);
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get single package
  async getPackage(req: Request, res: Response, next: NextFunction) {
    try {
      const pkg = await configService.getPackageById(req.params.id);
      if (!pkg) {
        return res.status(404).json({ error: 'Package not found' });
      }
      res.json(pkg);
    } catch (error) {
      next(error);
    }
  }

  // Admin: Create package
  async createPackage(req: Request, res: Response, next: NextFunction) {
    try {
      const parse = createPackageSchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({ error: parse.error.issues[0].message });
      }

      const pkg = await configService.createPackage(parse.data);
      res.status(201).json(pkg);
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update package
  async updatePackage(req: Request, res: Response, next: NextFunction) {
    try {
      const parse = updatePackageSchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({ error: parse.error.issues[0].message });
      }

      const pkg = await configService.updatePackage(req.params.id, parse.data);
      res.json(pkg);
    } catch (error) {
      next(error);
    }
  }

  // Admin: Delete package
  async deletePackage(req: Request, res: Response, next: NextFunction) {
    try {
      await configService.deletePackage(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const configController = new ConfigController();
```

**Step 2: Commit**

```bash
git add server/src/controllers/configController.ts
git commit -m "feat: add config controller with package CRUD"
```

---

## Task 5: Create Config Routes

**Files:**
- Create: `server/src/routes/config.ts`
- Modify: `server/src/routes/index.ts`

**Step 1: Create config routes with full CRUD**

Create `server/src/routes/config.ts`:

```typescript
import { Router } from 'express';
import { configController } from '../controllers/configController';

const router = Router();

// Public - get app configuration (TON + active packages)
router.get('/', configController.getAppConfig);

// Admin routes (TODO: add admin auth middleware)
// TON config
router.put('/ton', configController.updateTonConfig);

// Coin packages CRUD
router.get('/packages', configController.listPackages);
router.get('/packages/:id', configController.getPackage);
router.post('/packages', configController.createPackage);
router.put('/packages/:id', configController.updatePackage);
router.delete('/packages/:id', configController.deletePackage);

export default router;
```

**Step 2: Add to main router**

In `server/src/routes/index.ts`, add import:

```typescript
import configRoutes from './config';
```

Add after other routes:
```typescript
router.use('/config', configRoutes);
```

**Step 3: Commit**

```bash
git add server/src/routes/config.ts server/src/routes/index.ts
git commit -m "feat: add config routes with package CRUD"
```

---

## Task 6: Update Frontend API Service

**Files:**
- Modify: `src/services/api.ts`

**Step 1: Add config types and methods**

Add types to `src/services/api.ts`:

```typescript
export interface TonConfig {
  network: 'mainnet' | 'testnet';
  receiverAddress: string;
}

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price: number;
  bonus: number;
  sortOrder: number;
  active: boolean;
}

export interface AppConfig {
  ton: TonConfig;
  coinPackages: CoinPackage[];
}
```

Add method to ApiService class:

```typescript
async getConfig(): Promise<AppConfig> {
  return this.fetch<AppConfig>('/config');
}
```

**Step 2: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add config API to frontend"
```

---

## Task 7: Create Config Context

**Files:**
- Create: `src/contexts/ConfigContext.tsx`

**Step 1: Create config context**

Create `src/contexts/ConfigContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, AppConfig, CoinPackage } from '../services/api';

interface ConfigContextType {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const defaultConfig: AppConfig = {
  ton: {
    network: 'testnet',
    receiverAddress: '',
  },
  coinPackages: [],
};

const ConfigContext = createContext<ConfigContextType>({
  config: null,
  loading: true,
  error: null,
  refetch: async () => {},
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to load config:', err);
      setError('Failed to load configuration');
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, error, refetch: fetchConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
```

**Step 2: Commit**

```bash
git add src/contexts/ConfigContext.tsx
git commit -m "feat: add config context for frontend"
```

---

## Task 8: Add Config Provider to App

**Files:**
- Modify: `src/App.tsx`

**Step 1: Wrap app with ConfigProvider**

Import and wrap:

```typescript
import { ConfigProvider } from './contexts/ConfigContext';
```

Wrap the app content with ConfigProvider (inside TonConnectProvider):

```tsx
<ConfigProvider>
  {/* existing app content */}
</ConfigProvider>
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add ConfigProvider to app"
```

---

## Task 9: Update SettingsPage to Use Config

**Files:**
- Modify: `src/pages/SettingsPage/SettingsPage.tsx`

**Step 1: Replace hardcoded packages with config**

Import useConfig:
```typescript
import { useConfig } from '../../contexts/ConfigContext';
```

Remove the hardcoded `coinPackages` array.

In the component, get config:
```typescript
const { config, loading: configLoading } = useConfig();
```

Update the payment handler to use config:
```typescript
const handleBuyCoins = async (pkg: CoinPackage) => {
  if (!wallet || !config?.ton.receiverAddress) {
    if (!config?.ton.receiverAddress) {
      alert('Payment not configured. Please try again later.');
      return;
    }
    tonConnectUI.openModal();
    return;
  }

  // ... rest of handler

  const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [
      {
        address: config.ton.receiverAddress,
        amount: amountInNanoTon,
      },
    ],
  };
  // ...
};
```

Update the render to use `config?.coinPackages` and show network badge.

**Step 2: Commit**

```bash
git add src/pages/SettingsPage/SettingsPage.tsx
git commit -m "feat: use server config for coin packages and TON address"
```

---

## Task 10: Add Network Badge Component

**Files:**
- Create: `src/components/NetworkBadge/NetworkBadge.tsx`
- Create: `src/components/NetworkBadge/NetworkBadge.module.css`

**Step 1: Create NetworkBadge component**

Create `src/components/NetworkBadge/NetworkBadge.tsx`:

```typescript
import { useConfig } from '../../contexts/ConfigContext';
import styles from './NetworkBadge.module.css';

export function NetworkBadge() {
  const { config } = useConfig();

  if (!config) return null;

  const isTestnet = config.ton.network === 'testnet';

  return (
    <div className={`${styles.badge} ${isTestnet ? styles.testnet : styles.mainnet}`}>
      {isTestnet ? '🧪 Testnet' : '🔵 Mainnet'}
    </div>
  );
}
```

Create `src/components/NetworkBadge/NetworkBadge.module.css`:

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.testnet {
  background: #fef3c7;
  color: #92400e;
}

.mainnet {
  background: #dbeafe;
  color: #1e40af;
}
```

**Step 2: Commit**

```bash
git add src/components/NetworkBadge/
git commit -m "feat: add NetworkBadge component"
```

---

## Task 11: Run Database Migration on Server

**Step 1: Update deploy script to run migrations**

In `deploy.sh`, after `npx prisma generate`, add:

```bash
npx prisma migrate deploy
```

**Step 2: Commit and deploy**

```bash
git add deploy.sh
git commit -m "feat: add prisma migrate to deploy"
git push
```

Then on server:
```bash
cd /opt/p331-telegram-platform && git pull && bash deploy.sh
```

---

## Task 12: Test Configuration API

**Step 1: Test get config**

```bash
curl https://telegram-platform.eventyr.cloud/api/config
```

Expected: JSON with ton config and coinPackages.

**Step 2: Test update TON config**

```bash
curl -X PUT https://telegram-platform.eventyr.cloud/api/config/ton \
  -H "Content-Type: application/json" \
  -d '{"network":"testnet","receiverAddress":"UQC..."}'
```

Expected: Updated config JSON.

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Add SystemConfig and CoinPackage database models |
| 2 | Seed default config and packages |
| 3 | Create config service with package CRUD |
| 4 | Create config controller with CRUD endpoints |
| 5 | Create config routes |
| 6 | Update frontend API service |
| 7 | Create config context |
| 8 | Add ConfigProvider to app |
| 9 | Update SettingsPage to use config |
| 10 | Add NetworkBadge component |
| 11 | Deploy and run migrations |
| 12 | Test API endpoints |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Get TON config + active packages (public) |
| PUT | `/api/config/ton` | Update TON network/receiver (admin) |
| GET | `/api/config/packages` | List all packages (admin) |
| GET | `/api/config/packages/:id` | Get single package (admin) |
| POST | `/api/config/packages` | Create package (admin) |
| PUT | `/api/config/packages/:id` | Update package (admin) |
| DELETE | `/api/config/packages/:id` | Delete package (admin) |

## CoinPackage Fields

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique ID (auto-generated) |
| name | string | Display name ("Starter", "Best Deal") |
| coins | int | Number of coins user receives |
| price | float | Price in TON |
| bonus | int | Bonus percentage (0-100) |
| sortOrder | int | Display order |
| active | boolean | Show in app or hide |

**Minimum TON Transaction:** Prices are set to 0.01 TON (10,000,000 nanoTON) which is above the minimum network fee (~0.005 TON).
