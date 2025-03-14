// app/api/episodes/route.js - NEW
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const episodes = await prisma.episode.findMany({
      orderBy: {
        episodeNumber: 'desc',
      },
      select: {
        id: true,
        episodeNumber: true,
        title: true,
        publishDate: true,
      },
    });
    
    return NextResponse.json({ success: true, data: episodes });
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch episodes' },
      { status: 500 }
    );
  }
}
