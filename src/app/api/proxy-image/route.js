import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const photoRef = searchParams.get('photoRef');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  let url = '';
  if (photoRef) {
    url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photoreference=${photoRef}&key=${apiKey}`;
  } else if (lat && lng) {
    url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x250&maptype=hybrid&markers=color:blue%7Csize:mid%7C${lat},${lng}&key=${apiKey}`;
  } else {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch image from Google');
    
    const arrayBuffer = await res.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': res.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return new NextResponse(error.message, { status: 500 });
  }
}
