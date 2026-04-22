/*
  Warnings:

  - A unique constraint covering the columns `[reviewerId,orderId,dishId]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderId` to the `reviews` table without a default value. This is not possible if the table is not empty.
  - Made the column `dishId` on table `reviews` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_dishId_fkey";

-- DropIndex
DROP INDEX "reviews_reviewerId_revieweeId_dishId_key";

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "orderId" TEXT NOT NULL,
ALTER COLUMN "dishId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "reviews_orderId_idx" ON "reviews"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_reviewerId_orderId_dishId_key" ON "reviews"("reviewerId", "orderId", "dishId");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dishes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
