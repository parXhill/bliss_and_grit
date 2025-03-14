import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');
  
  try {
    let episodes;
    
    if (keyword) {
      // Search episodes by keyword
      episodes = await prisma.episode.findMany({
        where: {
          keywords: {
            some: {
              word: {
                contains: keyword,
                mode: 'insensitive'
              }
            }
          }
        },
        include: {
          keywords: true,
        },
        orderBy: {
          publishDate: 'desc'
        }
      });
    } else {
      // Get all episodes
      episodes = await prisma.episode.findMany({
        include: {
          keywords: true,
        },
        orderBy: {
          publishDate: 'desc'
        }
      });
    }
    
    return NextResponse.json(episodes);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const episode = await prisma.episode.create({
      data: {
        title: data.title,
        description: data.description,
        publishDate: data.publishDate ? new Date(data.publishDate) : null,
        fileName: data.fileName,
        keywords: {
          create: data.keywords?.map(word => ({ word })) || []
        }
      },
      include: {
        keywords: true,
      }
    });
    return NextResponse.json(episode, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}