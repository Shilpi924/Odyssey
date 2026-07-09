import { NextResponse } from 'next/server';
import { StateGraph, END, START } from '@langchain/langgraph';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function distanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateMockRoute(centerLat, centerLng) {
  const points = [];
  const radius = 0.01; // roughly 1km
  for (let i = 0; i <= 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    // adding some noise for realistic looking path
    const r = radius * (0.8 + Math.random() * 0.4); 
    const lat = centerLat + r * Math.sin(angle);
    const lng = centerLng + r * Math.cos(angle);
    points.push([lng, lat]); // GeoJSON is [lng, lat]
  }
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: points
    }
  };
}

const WEATHER_LABELS = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Moderate snow', 75: 'Heavy snow',
  80: 'Light showers', 81: 'Moderate showers', 82: 'Violent showers',
  95: 'Thunderstorm', 96: 'Thunderstorm + hail',
};

async function fetchWeather(lat, lng) {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weathercode,apparent_temperature,wind_speed_10m` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=1`
    );
    const data = await res.json();
    const c = data.current;
    const condition = WEATHER_LABELS[c.weathercode] || 'Unknown';
    // Dummy pollen/aqi logic for demo purposes
    const pollen = ['Clear sky', 'Mainly clear'].includes(condition) ? 'High' : 'Low';
    const aqi = ['Foggy', 'Icy fog', 'Thunderstorm'].includes(condition) ? 75 : 42;

    return {
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      code: c.weathercode,
      condition,
      windSpeed: Math.round(c.wind_speed_10m),
      pollen,
      aqi,
    };
  } catch {
    return null;
  }
}

function buildUserContext(preferences) {
  const { hiking = {}, food = {}, activityLevel, travelWith, groupDynamics, interests = [], accessibility = [] } = preferences;
  const parts = [];
  
  // Hiking Prefs
  const DIFF_MAP = { Easy: 'Easy', Moderate: 'Moderate', Strenuous: 'Strenuous', Expert: 'Expert' };
  if (hiking.difficulty) {
    const diffs = Array.isArray(hiking.difficulty) ? hiking.difficulty : [hiking.difficulty];
    if (diffs.length > 0 && diffs[0] !== '') parts.push(`Preferred difficulty: ${diffs.map(d => DIFF_MAP[d] || d).join(', ')}`);
  }
  const FEAT = { Shaded: 'shaded', Sunny: 'sunny', Water: 'water', Summit: 'summit', DogFriendly: 'dog-friendly', Loop: 'loop', Scenic: 'scenic', EasyParking: 'parking', Wildflowers: 'wildflowers', Alpine: 'alpine' };
  if (hiking.features) {
    const feats = Array.isArray(hiking.features) ? hiking.features : [hiking.features];
    if (feats.length > 0 && feats[0] !== '') parts.push(`Features: ${feats.map(f => FEAT[f] || f).join(', ')}`);
  }
  const LENS = { short: 'under 2 miles', medium: '2–5 miles', long: '5–10 miles', verylong: '10+ miles' };
  if (hiking.length) parts.push(`Length: ${LENS[hiking.length] || hiking.length}`);
  const ELEVS = { flat: 'flat', gentle: 'gentle', moderate: 'moderate', steep: 'steep' };
  if (hiking.elevation) parts.push(`Elevation: ${ELEVS[hiking.elevation] || hiking.elevation}`);
  
  // Food Prefs
  if (food.cuisines && food.cuisines.length > 0) parts.push(`Food Cuisines: ${food.cuisines.join(', ')}`);
  if (food.diet && food.diet.length > 0) parts.push(`Dietary Restrictions: ${food.diet.join(', ')}`);
  if (food.diningStyle) parts.push(`Dining Style: ${food.diningStyle}`);
  if (food.atmosphere && food.atmosphere.length > 0) parts.push(`Atmosphere: ${food.atmosphere.join(', ')}`);

  // General Prefs
  if (activityLevel) parts.push(`Fitness: ${activityLevel}`);
  if (travelWith) parts.push(`With: ${travelWith}`);
  if (groupDynamics) parts.push(`Group Dynamics: ${groupDynamics}`);
  if (interests.length) parts.push(`Interests: ${interests.join(', ')}`);
  if (accessibility.length) parts.push(`Accessibility Needs: ${accessibility.join(', ')}`);
  
  return parts.length ? `User profile:\n${parts.map(p => `- ${p}`).join('\n')}` : '';
}

function getWeatherAdvisory(weather) {
  if (!weather) return 'Weather unknown.';
  const { code, temp } = weather;
  if (code >= 95) return 'DANGER: Thunderstorm.';
  if (code >= 80) return 'Rain showers.';
  if (code >= 61) return 'Rainy.';
  if (temp > 95) return 'EXTREME HEAT.';
  if (temp > 85) return 'Hot.';
  if (temp < 32) return 'Freezing.';
  return 'Excellent conditions.';
}

// ─── Graph Nodes ──────────────────────────────────────────────────────────────

async function routerNode(state) {
  const { query, preferences, forceMode } = state;
  
  // Hard override
  if (forceMode === 'ai') return { next: 'aiSearch' };
  if (forceMode === 'fast') return { next: 'fastSearch' };

  // Explicit user preference for hiking (auto-AI)
  const hasHikingPrefs = Object.values(preferences?.hiking || {}).some((v) =>
    Array.isArray(v) ? v.length > 0 : !!v
  );

  const system = `You are an intelligent query router. Evaluate the user's hiking query and profile.
Your job is to decide whether this query can be handled by a basic, fast Google Places search (fastSearch), OR if it requires a powerful, reasoning AI (aiSearch).
Rules for aiSearch:
- User has specific hiking preferences set (profile provided)
- Query mentions group dynamics (kids, seniors, dogs)
- Query mentions specific non-standard desires (peaceful, epic, sunset, avoiding crowds, specific views)
- Query is conversational or nuanced.

Rules for fastSearch:
- Query is extremely basic (e.g., "hikes near me", "trails", "parks") AND user has no special profile preferences.

Respond ONLY with valid JSON:
{ "route": "fastSearch" | "aiSearch" }`;

  const userMsg = `Query: "${query || 'hikes'}"\nHas Profile: ${hasHikingPrefs ? 'Yes' : 'No'}`;

  // Using the cheapest, fastest model (Haiku) for token optimization
  const res = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 150,
    system,
    messages: [{ role: 'user', content: userMsg }],
  });

  try {
    const parsed = JSON.parse(res.content[0].text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, ''));
    return { next: parsed.route === 'aiSearch' ? 'aiSearch' : 'fastSearch' };
  } catch {
    // Default to fast if parsing fails
    return { next: 'fastSearch' };
  }
}

async function fastSearchNode(state) {
  const { lat, lng, preferences, query, radius } = state;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  let keyword = query ? query : 'hiking trail nature';
  
  // Apply food preferences if no query and user is interested in food
  if (!query && preferences?.interests?.includes('Food & Drink') && preferences?.food?.cuisines?.length > 0) {
    keyword = `${preferences.food.cuisines.join(' ')} restaurant`;
  } else if (!query && preferences?.hiking?.features) {
    const feats = Array.isArray(preferences.hiking.features) ? preferences.hiking.features : [preferences.hiking.features];
    if (feats.length > 0 && feats[0] !== '') keyword += ` ${feats.join(' ')}`;
  }
  
  const radiusMeters = radius ? radius * 1609.34 : 25000;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${Math.round(radiusMeters)}&keyword=${encodeURIComponent(keyword)}&key=${key}`;
  
  const res = await fetch(url);
  const data = await res.json();

  let trails = (data.results || [])
    .filter((place) => !(state.excludeNames || []).includes(place.name))
    .map((place) => {
      const pLat = place.geometry.location.lat;
      const pLng = place.geometry.location.lng;
      const dist = distanceMiles(lat, lng, pLat, pLng);
      return {
        name: place.name,
        lat: pLat,
        lng: pLng,
        distanceNum: dist,
        distance: `${dist.toFixed(1)} miles away`,
        vicinity: place.vicinity || '',
        rating: place.rating || null,
        userRatingsTotal: place.user_ratings_total || 0,
        placeId: place.place_id,
        photoRef: place.photos?.[0]?.photo_reference || null,
        source: 'google_places',
        route: generateMockRoute(pLat, pLng),
        difficulty: null, length: null, elevationGain: null, features: [], why: null, tip: null, bestTime: null, parkingNote: null, weatherNote: null, sparkline: [0,0,0,0,0,0],
      };
    });

  trails.sort((a, b) => a.distanceNum - b.distanceNum);
  trails = trails.slice(0, 10);

  return { results: trails, source: 'fast' };
}

async function aiSearchNode(state) {
  const { lat, lng, locationName, preferences, query, groupDescription, radius } = state;
  const weather = await fetchWeather(lat, lng);
  const userContext = buildUserContext(preferences || {});
  const adv = getWeatherAdvisory(weather);
  const loc = locationName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  const searchRadius = radius ? `${radius} miles` : '15 miles';

  const target = query ? `recommendations matching "${query}"` : 'hiking trails and points of interest';

  const systemPrompt = `You are an expert local travel guide with deep knowledge of trails, food, local communities, and what makes an experience personally meaningful.
Suggest exactly 10 real, specific ${target} near the user's location (within ${searchRadius}) that best match their preferences, personality, current weather, and any natural language request. 
CRITICAL: Analyze their profile and explicitly recommend places/activities that like-minded people with the exact same interests enjoy doing.
CRITICAL: If the user has a preferred difficulty, try to match it. HOWEVER, if their current query contradicts their preference (e.g., asking for "kid friendly" but profile says "Strenuous"), prioritize the query over the profile! In the "why" field, explicitly warn the user if you are suggesting a strenuous hike, or explain that you chose an easier hike for the kids despite their preference.
${state.excludeNames?.length ? `CRITICAL: The user wants MORE results. DO NOT return any of these previously suggested places: ${state.excludeNames.join(', ')}. Return up to 10 NEW places. If you can only find a few, return them. DO NOT apologize or add conversational text. ONLY return the JSON array.` : ''}

Return ONLY a JSON array of objects with these exact fields:
- "name": string
- "lat": number
- "lng": number
- "distance": string (e.g. "3.2 miles away")
- "difficulty": "Easy" | "Moderate" | "Strenuous" | "Expert" | null (Use null if not a hike)
- "length": string | null (Use null if not a hike)
- "elevationGain": string | null (Use null if not a hike)
- "features": string[] (e.g. Shaded, Sunny, Water, Summit, DogFriendly, Loop, Scenic, EasyParking, Wildflowers, Alpine, Food, Indoor, Social)
- "why": string (2-3 sentences explaining WHY this matches them personally)
- "tip": string
- "bestTime": string
- "parkingNote": string
- "weatherNote": string | null (weather-specific advice based on conditions)
- "sparkline": number[] (array of exactly 6 integers representing elevation profile shape, or [0,0,0,0,0,0] if not a hike)
- "rating": number (e.g. 4.8)
- "estimatedWeeklyVisitors": number (realistic estimate of weekly visitors, e.g. 1500)

Respond ONLY with valid JSON.`;

  const userMessage = `Find 10 ${target} near ${loc} (within ${searchRadius}).
${userContext ? `\n${userContext}` : ''}
${query ? `\nWhat I want: "${query}"` : ''}
${groupDescription ? `\nGroup details: ${groupDescription}` : ''}
${weather ? `\nCurrent weather: ${weather.temp}°F, ${weather.condition}` : ''}
Weather advisory: ${adv}`;

  // Using Opus (large reasoning model) for the deep personalization
  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 3500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = message.content[0].text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  let trails = [];
  try { 
    trails = JSON.parse(raw); 
    trails = trails.map(t => {
      const dist = distanceMiles(lat, lng, t.lat, t.lng);
      return { ...t, distanceNum: dist, distance: `${dist.toFixed(1)} miles away`, route: generateMockRoute(t.lat, t.lng) };
    });
    trails.sort((a, b) => a.distanceNum - b.distanceNum);
  } catch { /* ignore parse error for now */ }

  return { results: trails, source: 'ai', weather };
}

// ─── Graph Definition ─────────────────────────────────────────────────────────

// Defines how the state merges updates from nodes
const graphState = {
  lat: { value: (prev, next) => next ?? prev },
  lng: { value: (prev, next) => next ?? prev },
  locationName: { value: (prev, next) => next ?? prev },
  query: { value: (prev, next) => next ?? prev },
  preferences: { value: (prev, next) => next ?? prev },
  groupDescription: { value: (prev, next) => next ?? prev },
  forceMode: { value: (prev, next) => next ?? prev },
  excludeNames: { value: (prev, next) => next ?? prev },
  radius: { value: (prev, next) => next ?? prev },
  
  // Output fields
  next: { value: (prev, next) => next ?? prev },
  results: { value: (prev, next) => next ?? prev },
  source: { value: (prev, next) => next ?? prev },
  weather: { value: (prev, next) => next ?? prev },
};

const builder = new StateGraph({ channels: graphState })
  .addNode('router', routerNode)
  .addNode('fastSearch', fastSearchNode)
  .addNode('aiSearch', aiSearchNode)
  .addEdge(START, 'router')
  .addConditionalEdges('router', (state) => state.next, {
    fastSearch: 'fastSearch',
    aiSearch: 'aiSearch',
  })
  .addEdge('fastSearch', END)
  .addEdge('aiSearch', END);

const graph = builder.compile();

// ─── Next.js Route ────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.lat || !body.lng) return NextResponse.json({ error: 'Location required' }, { status: 400 });

    const finalState = await graph.invoke({
      lat: body.lat,
      lng: body.lng,
      locationName: body.locationName,
      query: body.naturalLanguageQuery,
      preferences: body.preferences,
      groupDescription: body.groupDescription,
      forceMode: body.forceMode, // null | 'ai' | 'fast'
      excludeNames: body.excludeNames || [],
      radius: body.radius || 25,
    });

    return NextResponse.json({
      trails: finalState.results,
      source: finalState.source,
      weather: finalState.weather,
      _routedBy: finalState.next,
    });
  } catch (error) {
    console.error('Smart search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Export for testing
export { buildUserContext, distanceMiles };
