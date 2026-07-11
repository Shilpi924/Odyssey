import { NextResponse } from 'next/server';
import { StateGraph, END, START } from '@langchain/langgraph';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../../../lib/pg';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function distanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchRealRoute(centerLat, centerLng, trailId) {
  // 1. Try to hit PostgreSQL Cache if available
  if (db && trailId) {
    try {
      const res = await db.query(
        'SELECT ST_AsGeoJSON(geom) as geom_json FROM trails WHERE id = $1',
        [trailId]
      );
        
      if (res.rows.length > 0 && res.rows[0].geom_json) {
        return {
          type: "Feature",
          geometry: JSON.parse(res.rows[0].geom_json)
        };
      }
    } catch (e) {
      console.warn('Postgres cache miss/error:', e.message);
    }
  }

  // 2. Query Overpass for a path/track within ~1000m of the given point
  const query = `[out:json];way(around:1000,${centerLat},${centerLng})[highway~"path|track|footway"];out geom;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  
  let geometryToReturn = {
    type: "LineString",
    coordinates: [[centerLng, centerLat]]
  };

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    
    // Find the first way with geometry
    const way = data.elements?.find(e => e.type === 'way' && e.geometry?.length > 0);
    if (way) {
      geometryToReturn = {
        type: "LineString",
        coordinates: way.geometry.map(pt => [pt.lon, pt.lat])
      };
    }
  } catch (error) {
    console.warn(`Overpass API failed for ${centerLat},${centerLng}`, error.message);
    geometryToReturn = { type: "Point", coordinates: [centerLng, centerLat] };
  }

  // 3. Save to Postgres Cache
  if (db && trailId) {
    try {
      await db.query(
        `INSERT INTO trails (id, lat, lng, geom) 
         VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)) 
         ON CONFLICT (id) DO UPDATE SET geom = EXCLUDED.geom`,
        [trailId, centerLat, centerLng, JSON.stringify(geometryToReturn)]
      );
    } catch (e) {
      console.warn('Failed to insert into Postgres cache:', e.message);
    }
  }

  return {
    type: "Feature",
    geometry: geometryToReturn
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
    .slice(0, 10)
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
        difficulty: null, length: null, elevationGain: null, features: [], why: null, tip: null, bestTime: null, parkingNote: null, weatherNote: null, sparkline: [0,0,0,0,0,0],
      };
    });

  // Filter for safety: ensure we only suggest reasonably established trails if user asked for hikes
  // Only apply this filter if the query explicitly mentions hiking/trails
  const isHikingQuery = keyword.toLowerCase().includes('hiking') || 
                        keyword.toLowerCase().includes('trail') || 
                        keyword.toLowerCase().includes('hike');
  if (isHikingQuery) {
    trails = trails.filter(t => t.rating && t.rating >= 4.0 && t.userRatingsTotal > 5);
  }

  // Fetch real routes in parallel (only for hiking-related queries)
  if (isHikingQuery) {
    await Promise.all(trails.map(async (t) => {
      t.route = await fetchRealRoute(t.lat, t.lng, t.placeId);
    }));
  }

  trails.sort((a, b) => a.distanceNum - b.distanceNum);

  return { results: trails, source: 'fast' };
}

async function aiSearchNode(state) {
  const { lat, lng, locationName, preferences, query, groupDescription, radius } = state;
  const weather = await fetchWeather(lat, lng);
  const userContext = buildUserContext(preferences || {});
  const adv = getWeatherAdvisory(weather);
  const loc = locationName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  const searchRadius = radius ? `${radius} miles` : '15 miles';

  // Determine if this is a food/drink query or hiking query
  const isFoodQuery = query && (
    query.toLowerCase().includes('coffee') ||
    query.toLowerCase().includes('cafe') ||
    query.toLowerCase().includes('restaurant') ||
    query.toLowerCase().includes('food') ||
    query.toLowerCase().includes('dining') ||
    query.toLowerCase().includes('eat') ||
    query.toLowerCase().includes('breakfast') ||
    query.toLowerCase().includes('lunch') ||
    query.toLowerCase().includes('dinner')
  );

  const isHikingQuery = query && (
    query.toLowerCase().includes('hike') ||
    query.toLowerCase().includes('trail') ||
    query.toLowerCase().includes('mountain') ||
    query.toLowerCase().includes('peak') ||
    query.toLowerCase().includes('nature') ||
    query.toLowerCase().includes('walk')
  );

  const target = query ? `recommendations strictly matching "${query}"` : 'hiking trails and points of interest';

  const systemPrompt = `You are an expert local travel guide with deep knowledge of trails, food, local communities, and what makes an experience personally meaningful.
Suggest exactly 10 real, specific ${target} near the user's location (within ${searchRadius}) that best match their preferences, personality, current weather, and any natural language request.
CRITICAL: Analyze their profile and explicitly recommend places/activities that like-minded people with the exact same interests enjoy doing.
CRITICAL: If the user searches for a specific cuisine, dietary restriction, or food type (e.g., "Indian vegetarian food"), YOU MUST ONLY return places that exactly match this requirement. Do not return unrelated options.
CRITICAL: The nearest matching locations MUST appear first in your response array. Order them strictly by increasing distance from the user.
${state.priceRange ? `CRITICAL: The user has requested a price range of ${state.priceRange}. Only return options that fit within this budget.` : ''}
${isFoodQuery ? 'CRITICAL: This is a FOOD/DRINK search. ONLY return restaurants, cafes, coffee shops, or food establishments. DO NOT return hiking trails or outdoor activities.' : ''}
${isHikingQuery ? 'CRITICAL: This is a HIKING search. ONLY return hiking trails, nature walks, or outdoor activities. DO NOT return restaurants or food establishments.' : ''}
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
    
    // Safety Filter: Ensure high ratings for AI suggestions
    trails = trails.filter(t => t.rating && t.rating >= 4.0);

    trails = trails.map(t => {
      const dist = distanceMiles(lat, lng, t.lat, t.lng);
      return { ...t, distanceNum: dist, distance: `${dist.toFixed(1)} miles away` };
    });
    
    // Fetch real routes in parallel
    await Promise.all(trails.map(async (t) => {
      // Create a stable unique ID for AI suggested trails
      const uniqueId = t.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.round(t.lat * 100);
      t.route = await fetchRealRoute(t.lat, t.lng, uniqueId);
    }));

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
  priceRange: { value: (prev, next) => next ?? prev },
  
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
      priceRange: body.priceRange || null,
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
