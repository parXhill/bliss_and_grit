
-- This is a custom migration that safely adds the segmentId and matchScore fields
-- without losing any data, along with the necessary indexes and constraints

-- Add columns if they don't exist
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "segmentId" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "matchScore" DOUBLE PRECISION;

-- Create index
CREATE INDEX IF NOT EXISTS "Quote_segmentId_idx" ON "Quote"("segmentId");

-- Add foreign key constraint
ALTER TABLE "Quote" ADD CONSTRAINT IF NOT EXISTS "Quote_segmentId_fkey" 
FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE SET NULL ON UPDATE CASCADE;


