-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "publishDate" TIMESTAMP(3),
    "fileName" TEXT NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Speaker" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "displayName" TEXT,

    CONSTRAINT "Speaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "content" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "speakerId" TEXT NOT NULL,
    "turnId" TEXT,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turn" (
    "id" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "speakerId" TEXT NOT NULL,

    CONSTRAINT "Turn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Segment_episodeId_idx" ON "Segment"("episodeId");

-- CreateIndex
CREATE INDEX "Segment_speakerId_idx" ON "Segment"("speakerId");

-- CreateIndex
CREATE INDEX "Segment_turnId_idx" ON "Segment"("turnId");

-- CreateIndex
CREATE INDEX "Turn_episodeId_idx" ON "Turn"("episodeId");

-- CreateIndex
CREATE INDEX "Turn_speakerId_idx" ON "Turn"("speakerId");

-- CreateIndex
CREATE INDEX "Keyword_word_idx" ON "Keyword"("word");

-- CreateIndex
CREATE INDEX "Keyword_episodeId_idx" ON "Keyword"("episodeId");

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "Speaker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "Turn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "Speaker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
