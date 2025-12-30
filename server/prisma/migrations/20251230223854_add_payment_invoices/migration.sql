-- CreateTable
CREATE TABLE "PaymentInvoice" (
    "id" TEXT NOT NULL,
    "visibleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amountNano" TEXT NOT NULL,
    "amountCoins" DECIMAL(18,2) NOT NULL,
    "memo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "transactionId" TEXT,
    "bocHash" TEXT,
    "blockchainTxHash" TEXT,
    "senderAddress" TEXT,

    CONSTRAINT "PaymentInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentInvoice_visibleId_key" ON "PaymentInvoice"("visibleId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentInvoice_memo_key" ON "PaymentInvoice"("memo");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentInvoice_transactionId_key" ON "PaymentInvoice"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentInvoice_bocHash_key" ON "PaymentInvoice"("bocHash");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentInvoice_blockchainTxHash_key" ON "PaymentInvoice"("blockchainTxHash");

-- CreateIndex
CREATE INDEX "PaymentInvoice_userId_idx" ON "PaymentInvoice"("userId");

-- CreateIndex
CREATE INDEX "PaymentInvoice_status_idx" ON "PaymentInvoice"("status");

-- CreateIndex
CREATE INDEX "PaymentInvoice_memo_idx" ON "PaymentInvoice"("memo");

-- CreateIndex
CREATE INDEX "PaymentInvoice_expiresAt_idx" ON "PaymentInvoice"("expiresAt");

-- AddForeignKey
ALTER TABLE "PaymentInvoice" ADD CONSTRAINT "PaymentInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInvoice" ADD CONSTRAINT "PaymentInvoice_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
