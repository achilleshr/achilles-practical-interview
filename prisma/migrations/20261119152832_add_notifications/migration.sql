-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('HOURS_24', 'HOURS_2');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'OPTED_OUT', 'FAILED');

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "smsOptedIn" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "scheduleTime" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "interviewId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_status_scheduleTime_idx" ON "notifications"("status", "scheduleTime");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_interviewId_type_key" ON "notifications"("interviewId", "type");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
