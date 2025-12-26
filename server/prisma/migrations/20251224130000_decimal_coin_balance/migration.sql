-- AlterTable: Change coinBalance from BIGINT to DECIMAL(18,3)
ALTER TABLE "User" ALTER COLUMN "coinBalance" SET DATA TYPE DECIMAL(18,3);

-- AlterTable: Change amount from BIGINT to DECIMAL(18,3)
ALTER TABLE "Transaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,3);
