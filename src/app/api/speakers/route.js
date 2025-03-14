import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const speakers = await prisma.speaker.findMany();
    return NextResponse.json(speakers);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const speaker = await prisma.speaker.create({
      data: {
        id: data.id,
        name: data.name,
        displayName: data.displayName
      }
    });
    return NextResponse.json(speaker, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}