/*
  Warnings:

  - You are about to drop the column `orderStatus` on the `OrderedItem` table. All the data in the column will be lost.
  - You are about to drop the column `paymentId` on the `OrderedItem` table. All the data in the column will be lost.
  - You are about to drop the column `paymentStatus` on the `OrderedItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OrderedItem" DROP COLUMN "orderStatus",
DROP COLUMN "paymentId",
DROP COLUMN "paymentStatus";
