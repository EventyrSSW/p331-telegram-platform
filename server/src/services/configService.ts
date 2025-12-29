import { prisma } from '../db/client';
import { config } from '../config';

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
    const dbConfig = await this.loadSystemConfig();
    return {
      network: (dbConfig.get('ton_network') as 'mainnet' | 'testnet') || 'testnet',
      // Use DB value first, fall back to env variable for local dev
      receiverAddress: dbConfig.get('ton_receiver_address') || config.ton.paymentReceiverAddress || '',
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
