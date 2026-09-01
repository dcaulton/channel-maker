/*
  Warnings:

  - A unique constraint covering the columns `[sourceUrl]` on the table `MediaAsset` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "workId" TEXT;

-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'movie',
    "year" INTEGER,
    "genre" TEXT,
    "synopsis" TEXT,
    "seriesTitle" TEXT,
    "season" INTEGER,
    "episode" INTEGER,
    "externalIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Work_title_year_idx" ON "Work"("title", "year");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_sourceUrl_key" ON "MediaAsset"("sourceUrl");

-- CreateIndex
CREATE INDEX "MediaAsset_workId_idx" ON "MediaAsset"("workId");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE SET NULL ON UPDATE CASCADE;
