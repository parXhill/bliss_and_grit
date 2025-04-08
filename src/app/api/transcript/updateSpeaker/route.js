// app/api/transcript/updateSpeaker/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request) {
  const data = await request.json();
  const { id, newSpeakerId, recordType = 'auto' } = data;
  
  if (!id || !newSpeakerId) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }
  
  try {
    // First, determine the type of record we're working with
    let isTurn = false;
    let isSegment = false;
    let isQuote = false;
    let segmentWithTurn = false;
    let turnId = null;
    let segmentId = null;
    let quoteId = null;
    
    // If recordType is specified, use that
    if (recordType === 'turn') {
      isTurn = true;
      turnId = id;
    } else if (recordType === 'segment') {
      isSegment = true;
      segmentId = id;
    } else if (recordType === 'quote') {
      isQuote = true;
      quoteId = id;
    } else {
      // Auto-detect the record type (try turn, segment, then quote)
      try {
        const turn = await prisma.turn.findUnique({ where: { id } });
        if (turn) {
          isTurn = true;
          turnId = id;
        }
      } catch (e) {
        // Not a turn
      }
      
      if (!isTurn) {
        try {
          const segment = await prisma.segment.findUnique({ where: { id } });
          if (segment) {
            isSegment = true;
            segmentId = id;
            
            // Check if this segment belongs to a turn
            if (segment.turnId) {
              segmentWithTurn = true;
              turnId = segment.turnId;
            }
          }
        } catch (e) {
          // Not a segment either
        }
      }
      
      if (!isTurn && !isSegment) {
        try {
          const quote = await prisma.quote.findUnique({ where: { id } });
          if (quote) {
            isQuote = true;
            quoteId = id;
          }
        } catch (e) {
          // Not a quote either
        }
      }
    }
    
    // If we couldn't determine the record type, return an error
    if (!isTurn && !isSegment && !isQuote) {
      return NextResponse.json(
        { success: false, error: 'Record not found as either turn, segment, or quote' },
        { status: 404 }
      );
    }
    
    // Handle different update scenarios
    if (isTurn) {
      // 1. Updating a Turn - also update all its segments
      const updatedTurn = await prisma.turn.update({
        where: { id: turnId },
        data: { speakerId: newSpeakerId },
        include: { speaker: true }
      });
      
      // Update all segments associated with this turn
      await prisma.segment.updateMany({
        where: { turnId: turnId },
        data: { speakerId: newSpeakerId }
      });
      
      return NextResponse.json({ 
        success: true, 
        data: updatedTurn,
        recordType: 'turn',
        relatedUpdates: 'segments'
      });
    } 
    else if (isSegment && segmentWithTurn) {
      // 2. Updating a Segment that belongs to a Turn
      // First, check if we should update just the segment or the turn and all its segments
      const updateEntireTurn = true; // Set to false if you want to allow individual segment updates
      
      if (updateEntireTurn) {
        // Update the turn
        const updatedTurn = await prisma.turn.update({
          where: { id: turnId },
          data: { speakerId: newSpeakerId },
          include: { speaker: true }
        });
        
        // Update all segments associated with this turn
        await prisma.segment.updateMany({
          where: { turnId: turnId },
          data: { speakerId: newSpeakerId }
        });
        
        return NextResponse.json({ 
          success: true, 
          data: updatedTurn,
          recordType: 'turn',
          updatedFrom: 'segment',
          relatedUpdates: 'all-segments'
        });
      } else {
        // Update just this segment
        const updatedSegment = await prisma.segment.update({
          where: { id: segmentId },
          data: { speakerId: newSpeakerId },
          include: { speaker: true }
        });
        
        return NextResponse.json({ 
          success: true, 
          data: updatedSegment,
          recordType: 'segment',
          relatedUpdates: 'none'
        });
      }
    }
    else if (isSegment) {
      // 3. Updating a standalone Segment
      const updatedSegment = await prisma.segment.update({
        where: { id: segmentId },
        data: { speakerId: newSpeakerId },
        include: { speaker: true }
      });
      
      return NextResponse.json({ 
        success: true, 
        data: updatedSegment,
        recordType: 'segment',
        relatedUpdates: 'none'
      });
    }
    else if (isQuote) {
      // 4. Updating a Quote
      const updatedQuote = await prisma.quote.update({
        where: { id: quoteId },
        data: { speakerId: newSpeakerId },
        include: { speaker: true }
      });
      
      return NextResponse.json({ 
        success: true, 
        data: updatedQuote,
        recordType: 'quote',
        relatedUpdates: 'none'
      });
    }
  } catch (error) {
    console.error('Update speaker error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update speaker: ' + error.message },
      { status: 500 }
    );
  }
}