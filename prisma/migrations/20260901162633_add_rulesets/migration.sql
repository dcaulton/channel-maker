-- AlterTable
ALTER TABLE "ScheduleSlot" ADD COLUMN     "origin" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "ruleId" TEXT;

-- CreateTable
CREATE TABLE "Ruleset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "applyMode" TEXT NOT NULL DEFAULT 'sequential',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ruleset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "rulesetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'local',
    "honorGlobals" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelRuleset" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "rulesetId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelRuleset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ruleset_slug_key" ON "Ruleset"("slug");

-- CreateIndex
CREATE INDEX "Rule_rulesetId_sortOrder_idx" ON "Rule"("rulesetId", "sortOrder");

-- CreateIndex
CREATE INDEX "ChannelRuleset_channelId_isActive_idx" ON "ChannelRuleset"("channelId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelRuleset_channelId_rulesetId_key" ON "ChannelRuleset"("channelId", "rulesetId");

-- CreateIndex
CREATE INDEX "ScheduleSlot_ruleId_idx" ON "ScheduleSlot"("ruleId");

-- AddForeignKey
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "Ruleset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelRuleset" ADD CONSTRAINT "ChannelRuleset_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelRuleset" ADD CONSTRAINT "ChannelRuleset_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "Ruleset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
