/*
  Warnings:

  - You are about to drop the `BudgetItem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `amount` to the `Budget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryId` to the `Budget` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Account_name_idx";

-- DropIndex
DROP INDEX "BudgetItem_budgetId_categoryId_key";

-- DropIndex
DROP INDEX "Category_name_type_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BudgetItem";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Budget" ("createdAt", "id", "month") SELECT "createdAt", "id", "month" FROM "Budget";
DROP TABLE "Budget";
ALTER TABLE "new_Budget" RENAME TO "Budget";
CREATE INDEX "Budget_month_idx" ON "Budget"("month");
CREATE UNIQUE INDEX "Budget_month_categoryId_key" ON "Budget"("month", "categoryId");
CREATE TABLE "new_DebtPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "debtId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" INTEGER NOT NULL,
    "accountId" TEXT,
    "transactionId" TEXT,
    CONSTRAINT "DebtPayment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DebtPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DebtPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DebtPayment" ("accountId", "amount", "date", "debtId", "id", "transactionId") SELECT "accountId", "amount", "date", "debtId", "id", "transactionId" FROM "DebtPayment";
DROP TABLE "DebtPayment";
ALTER TABLE "new_DebtPayment" RENAME TO "DebtPayment";
CREATE UNIQUE INDEX "DebtPayment_transactionId_key" ON "DebtPayment"("transactionId");
CREATE TABLE "new_Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "nextDueDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountId" TEXT,
    CONSTRAINT "Subscription_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("accountId", "amount", "createdAt", "frequency", "id", "isActive", "name", "nextDueDate") SELECT "accountId", "amount", "createdAt", "frequency", "id", "isActive", "name", "nextDueDate" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE INDEX "Subscription_nextDueDate_idx" ON "Subscription"("nextDueDate");
CREATE INDEX "Subscription_isActive_idx" ON "Subscription"("isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Debt_dueDate_idx" ON "Debt"("dueDate");

-- CreateIndex
CREATE INDEX "Debt_status_idx" ON "Debt"("status");

-- CreateIndex
CREATE INDEX "Transaction_transferGroupId_idx" ON "Transaction"("transferGroupId");
