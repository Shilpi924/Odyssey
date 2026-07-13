import { NextResponse } from 'next/server';
import { fetchNpsParkBoundary } from '@/lib/trails/providers';
import { getParkByCode } from '@/lib/trails/catalog';

export async function GET(_request, context) {
  const { code } = await context.params;
  if (!getParkByCode(code)) return NextResponse.json({ error: 'Unsupported park code' }, { status: 400 });
  try {
    const feature = await fetchNpsParkBoundary(code, process.env.NPS_API_KEY);
    if (!feature) return NextResponse.json({ error: 'NPS API key not configured' }, { status: 503 });
    return NextResponse.json(feature);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
