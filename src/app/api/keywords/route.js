import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get all keywords and count how many episodes use each one
    const keywordCounts = await prisma.keyword.groupBy({
      by: ['word'],
      _count: {
        episodeId: true
      }
    });
    
    // Sort by count descending
    const sortedKeywords = keywordCounts.sort((a, b) => 
      b._count.episodeId - a._count.episodeId
    ).map(k => ({
      word: k.word,
      count: k._count.episodeId
    }));
    
    return NextResponse.json(sortedKeywords);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}