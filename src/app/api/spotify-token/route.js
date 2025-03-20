// app/api/spotify-token/route.js
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get credentials from environment variables
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
    
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing Spotify credentials in environment variables');
    }
    
    // Simple token refresh with the new refresh token that already has all required scopes
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error refreshing token:', errorData);
      throw new Error(`Failed to refresh token: ${response.status}`);
    }

    const data = await response.json();
    
    // Return the token info
    return NextResponse.json({ 
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope
    });
  } catch (error) {
    console.error('Error in Spotify token endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh token', 
      details: error.message 
    }, { status: 500 });
  }
}