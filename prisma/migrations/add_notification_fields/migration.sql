-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "notificationTarget",
ADD COLUMN "discordWebhookUrl" TEXT,
ADD COLUMN "telegramChatId" TEXT;
