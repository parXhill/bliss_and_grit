// app/api/speakers/route.js - NEW
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const speakers = await prisma.speaker.findMany({
      orderBy: {
        displayName: 'asc',
      },
    });
    
    return NextResponse.json({ success: true, data: speakers });
  } catch (error) {
    console.error('Error fetching speakers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch speakers' },
      { status: 500 }
    );
  }
}
