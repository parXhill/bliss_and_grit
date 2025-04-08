// Server Component
import { QuoteCollection } from './components/QuoteCollection';
import { PrismaClient } from '@prisma/client';

// Create a new Prisma client instance
const prisma = new PrismaClient();

export const dynamic = 'force-dynamic'; // Ensures fresh data on each request

export default async function QuotesPage() {
  // Fetch quotes with their related data
  const quotes = await prisma.quote.findMany({
    include: {
      episode: true,
      speaker: true,
      segment: true
    },
    orderBy: {
      episode: {
        episodeNumber: 'asc'  // Changed from 'number' to 'episodeNumber'
      }
    }
  });
  
  // Get all unique speakers
  const speakers = await prisma.speaker.findMany({
    orderBy: {
      name: 'asc'
    }
  });
  
  // Get all episodes
  const episodes = await prisma.episode.findMany({
    orderBy: {
      episodeNumber: 'asc'
    }
  });
  
  return <QuoteCollection initialQuotes={quotes} speakers={speakers} episodes={episodes} />;
}