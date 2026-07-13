import { NextResponse } from 'next/server';
import { fetchNpsAlerts } from '@/lib/trails/providers';
import { getParkByCode } from '@/lib/trails/catalog';

export async function GET(request) {
  const parkCode = new URL(request.url).searchParams.get('parkCode') || 'yose';
  if (!getParkByCode(parkCode)) return NextResponse.json({ error: 'Unsupported park code' }, { status: 400 });
  try {
    return NextResponse.json(await fetchNpsAlerts(parkCode, process.env.NPS_API_KEY));
  } catch (error) {
    return NextResponse.json({ error: error.message, available: false, alerts: [] }, { status: 502 });
  }
}
