// app/api/search/route.js - UPDATED
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  
  // Basic search params
  const query = searchParams.get('query');
  const speaker = searchParams.get('speaker');
  const timeStart = searchParams.get('timeStart');
  const timeEnd = searchParams.get('timeEnd');
  
  // Episode-specific search params
  const episodeNumber = searchParams.get('episodeNumber');
  const episodeTitle = searchParams.get('episodeTitle');
  const fullEpisode = searchParams.get('fullEpisode') === 'true';
  
  // Build episode where clause
  let episodeWhereClause = {};
  
  if (episodeNumber) {
    episodeWhereClause.episodeNumber = parseInt(episodeNumber, 10);
  }
  
  if (episodeTitle) {
    episodeWhereClause.title = {
      contains: episodeTitle,
      mode: 'insensitive',
    };
  }
  
  // Build segment where clause
  let segmentWhereClause = {};
  
  if (query) {
    segmentWhereClause.content = {
      contains: query,
      mode: 'insensitive',
    };
  }
  
  if (speaker) {
    segmentWhereClause.speakerId = speaker;
  }
  
  if (timeStart) {
    segmentWhereClause.startTime = {
      gte: timeStart,
    };
  }
  
  if (timeEnd) {
    segmentWhereClause.startTime = {
      ...(segmentWhereClause.startTime || {}),
      lte: timeEnd,
    };
  }
  
  // Combine the where clauses
  const whereClause = {
    ...segmentWhereClause,
    episode: Object.keys(episodeWhereClause).length > 0 ? episodeWhereClause : undefined,
  };
  
  try {
    // If fullEpisode is true and we have episode filters, get the full transcript using turns
    if (fullEpisode && Object.keys(episodeWhereClause).length > 0) {
      const episodes = await prisma.episode.findMany({
        where: episodeWhereClause,
        include: {
          turns: {
            include: {
              speaker: true,
            },
            orderBy: {
              startTime: 'asc',
            },
          },
        },
      });
      
      // Flatten the turns and add episode info
      const turns = episodes.flatMap(episode => 
        episode.turns.map(turn => ({
          ...turn,
          episode: {
            title: episode.title,
            episodeNumber: episode.episodeNumber,
          },
        }))
      );
      
      return NextResponse.json({ 
        success: true, 
        data: turns,
        isFullEpisode: true,
        episodeCount: episodes.length,
        resultType: 'turns'
      });
    } else {
      // Regular segment search
      const segments = await prisma.segment.findMany({
        where: whereClause,
        include: {
          speaker: true,
          episode: {
            select: {
              title: true,
              episodeNumber: true,
            },
          },
        },
        orderBy: [
          { episodeId: 'asc' },
          { startTime: 'asc' },
        ],
      });
      
      return NextResponse.json({ success: true, data: segments });
    }
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search transcripts' },
      { status: 500 }
    );
  }
}
