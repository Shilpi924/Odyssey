import { NextResponse } from 'next/server';

function parseCoordinates(searchParams) {
  if (!searchParams.has('lat') || !searchParams.has('lng')) return null;
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export async function GET(request) {
  const searchParams = new URL(request.url).searchParams;
  const coordinates = parseCoordinates(searchParams);
  const address = searchParams.get('address')?.trim();
  if (!coordinates && !address) return NextResponse.json({ error: 'Valid coordinates or address required' }, { status: 400 });

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Server geocoding is not configured' }, { status: 503 });

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  if (coordinates) url.searchParams.set('latlng', `${coordinates.lat},${coordinates.lng}`);
  else url.searchParams.set('address', address);
  url.searchParams.set('key', apiKey);

  try {
    const response = await fetch(url, { next: { revalidate: 86400 } });
    if (!response.ok) throw new Error(`Geocoding request failed (${response.status})`);
    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.[0]) {
      return NextResponse.json({ error: `Geocoding returned ${data.status || 'no results'}` }, { status: data.status === 'ZERO_RESULTS' ? 404 : 502 });
    }
    const result = data.results[0];
    return NextResponse.json({
      label: result.formatted_address,
      location: result.geometry?.location || coordinates,
      placeId: result.place_id || null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
