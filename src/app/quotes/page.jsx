// Server Component
import { QuoteCollection } from './components/QuoteCollection';
import { PrismaClient } from '@prisma/client';
import { Nunito } from 'next/font/google';


const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

// Create a new Prisma client instance
const prisma = new PrismaClient();

export const dynamic = 'force-dynamic'; // Ensures fresh data on each request

export default async function QuotesPage() {
  // Fetch quotes with their related data but only for allowed speakers
  const quotes = await prisma.quote.findMany({
    where: {
      speaker: {
        id: {
          in: ['vanessa', 'brooke'] // Only fetch quotes from these speakers upfront
        }
      }
    },
    include: {
      episode: true,
      speaker: true,
      segment: true
    },
    orderBy: {
      episode: {
        episodeNumber: 'asc'
      }
    }
  });
  
  // Get specific speakers (only vanessa and brooke)
  const speakers = await prisma.speaker.findMany({
    where: {
      id: {
        in: ['vanessa', 'brooke']
      }
    },
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
  
  return <div className={`${nunito.className}`} ><QuoteCollection initialQuotes={quotes} speakers={speakers} episodes={episodes} /></div>;
}