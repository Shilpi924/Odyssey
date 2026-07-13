import { NextResponse } from 'next/server';
import { searchVerifiedTrails } from '@/lib/trails/search-response';

export function buildHikingSearchQuery(query, preferences = {}) {
  const base = query?.trim() || 'nearby';
  const difficulties = preferences?.hiking?.difficulty;
  const difficulty = (Array.isArray(difficulties) ? difficulties : [difficulties]).filter(Boolean).join(' ');
  return `${difficulty ? `${difficulty} ` : ''}hiking trails ${base}`.trim();
}
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  return NextResponse.json(searchVerifiedTrails({
    lat: body.lat,
    lng: body.lng,
    query: body.query,
    preferences: body.preferences,
  }));
}
