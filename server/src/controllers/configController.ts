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
