import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const episode = await prisma.episode.findUnique({
      where: {
        id: params.id
      },
      include: {
        turns: {
          include: {
            speaker: true,
            segments: true
          },
          orderBy: {
            startTime: 'asc'
          }
        },
        keywords: true
      }
    });
    
    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }
    
    return NextResponse.json(episode);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const data = await request.json();
    const episode = await prisma.episode.update({
      where: {
        id: params.id
      },
      data: {
        title: data.title,
        description: data.description,
        publishDate: data.publishDate ? new Date(data.publishDate) : null,
        fileName: data.fileName
      }
    });
    return NextResponse.json(episode);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    // Delete related records first
    await prisma.$transaction([
      prisma.keyword.deleteMany({
        where: { episodeId: params.id }
      }),
      prisma.segment.deleteMany({
        where: { episodeId: params.id }
      }),
      prisma.turn.deleteMany({
        where: { episodeId: params.id }
      }),
      prisma.episode.delete({
        where: { id: params.id }
      })
    ]);
    
    return NextResponse.json({ message: 'Episode deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}