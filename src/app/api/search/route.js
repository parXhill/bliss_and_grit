import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }
  
  try {
    // Search across segments content and episode titles
    const results = await prisma.$transaction([
      // Search in episode titles and descriptions
      prisma.episode.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        },
        include: {
          keywords: true
        }
      }),
      
      // Search in turn content
      prisma.turn.findMany({
        where: {
          content: {
            contains: query,
            mode: 'insensitive'
          }
        },
        include: {
          episode: true,
          speaker: true
        }
      }),
      
      // Search in segment content
      prisma.segment.findMany({
        where: {
          content: {
            contains: query,
            mode: 'insensitive'
          }
        },
        include: {
          episode: true,
          speaker: true
        },
        take: 50 // Limit results
      })
    ]);
    
    return NextResponse.json({
      episodes: results[0],
      turns: results[1],
      segments: results[2]
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}