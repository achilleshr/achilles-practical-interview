-- CreateEnum
CREATE TYPE "SmsProviderMessageStatus" AS ENUM ('DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "sms_provider_messages" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SmsProviderMessageStatus" NOT NULL,

    CONSTRAINT "sms_provider_messages_pkey" PRIMARY KEY ("id")
);

