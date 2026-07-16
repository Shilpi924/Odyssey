import { NextResponse } from 'next/server';
import { searchVerifiedTrails } from '@/lib/trails/search-response';

export function distanceMiles(lat1, lon1, lat2, lon2) {
  const radius = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export function buildUserContext(preferences = {}) {
  const { hiking = {}, food = {}, activityLevel, travelWith, groupDynamics, interests = [], accessibility = [] } = preferences;
  const parts = [];
  const difficulties = Array.isArray(hiking.difficulty) ? hiking.difficulty : [hiking.difficulty].filter(Boolean);
  const features = Array.isArray(hiking.features) ? hiking.features : [hiking.features].filter(Boolean);
  const featureNames = { Shaded: 'shaded', Sunny: 'sunny', Water: 'water', Summit: 'summit', DogFriendly: 'dog-friendly', Loop: 'loop', Scenic: 'scenic', EasyParking: 'parking', Wildflowers: 'wildflowers', Alpine: 'alpine' };
  const lengths = { short: 'under 2 miles', medium: '2–5 miles', long: '5–10 miles', verylong: '10+ miles' };

  if (difficulties.length) parts.push(`Preferred difficulty: ${difficulties.join(', ')}`);
  if (features.length) parts.push(`Features: ${features.map(feature => featureNames[feature] || feature).join(', ')}`);
  if (hiking.length) parts.push(`Length: ${lengths[hiking.length] || hiking.length}`);
  if (hiking.elevation) parts.push(`Elevation: ${hiking.elevation}`);
  if (food.cuisines?.length) parts.push(`Food Cuisines: ${food.cuisines.join(', ')}`);
  if (food.diet?.length) parts.push(`Dietary Restrictions: ${food.diet.join(', ')}`);
  if (food.diningStyle) parts.push(`Dining Style: ${food.diningStyle}`);
  if (food.atmosphere?.length) parts.push(`Atmosphere: ${food.atmosphere.join(', ')}`);
  if (activityLevel) parts.push(`Fitness: ${activityLevel}`);
  if (travelWith) parts.push(`With: ${travelWith}`);
  if (groupDynamics) parts.push(`Group Dynamics: ${groupDynamics}`);
  if (interests.length) parts.push(`Interests: ${interests.join(', ')}`);
  if (accessibility.length) parts.push(`Accessibility Needs: ${accessibility.join(', ')}`);
  return parts.length ? `User profile:\n${parts.map(part => `- ${part}`).join('\n')}` : '';
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Number.isFinite(Number(body.lat)) || !Number.isFinite(Number(body.lng))) {
    return NextResponse.json({ error: 'Location required' }, { status: 400 });
  }

  const response = await searchVerifiedTrails({
    lat: body.lat,
    lng: body.lng,
    query: body.naturalLanguageQuery,
    preferences: body.preferences,
    excludeNames: body.excludeNames,
    radius: body.radius,
  });
  return NextResponse.json({ ...response, _routedBy: response.source === 'catalog' ? 'verifiedCatalog' : 'communitySearch' });
}
