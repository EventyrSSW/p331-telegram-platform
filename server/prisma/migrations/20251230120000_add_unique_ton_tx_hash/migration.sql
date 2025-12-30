-- DropIndex
DROP INDEX "Transaction_tonTxHash_idx";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "tonSenderAddress" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_tonTxHash_key" ON "Transaction"("tonTxHash");
