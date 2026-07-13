import { NextResponse } from 'next/server';
import { searchCatalog, toLegacySearchResult } from '@/lib/trails/search-engine';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function distanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getSearchType(query, preferences) {
  const q = query?.toLowerCase() || '';
  
  // Check if query explicitly mentions hiking
  if (q.includes('hike') || q.includes('trail') || q.includes('mountain') || q.includes('walk')) {
    return 'hiking';
  }
  
  // Check if query mentions food/drink
  if (q.includes('coffee') || q.includes('cafe') || q.includes('restaurant') || q.includes('food') || q.includes('dining')) {
    return 'food';
  }
  
  // Default to user's primary interest
  if (preferences?.interests?.[0]) {
    const interest = preferences.interests[0].toLowerCase();
    if (interest === 'hiking') return 'hiking';
    if (interest === 'food & drink') return 'food';
  }
  
  return 'hiking'; // Default
}

export function buildHikingSearchQuery(query, preferences = {}) {
  const base = query?.trim() || 'nearby';
  const difficulties = preferences?.hiking?.difficulty;
  const difficulty = (Array.isArray(difficulties) ? difficulties : [difficulties]).filter(Boolean).join(' ');
  return `${difficulty ? `${difficulty} ` : ''}hiking trails ${base}`.trim();
}

export async function POST(request) {
  try {
    const { lat, lng, query, preferences, radius = 25, priceRange } = await request.json();
    
    const searchType = getSearchType(query, preferences);
    const requestedDifficulties = preferences?.hiking?.difficulty;
    const requestedDifficulty = (Array.isArray(requestedDifficulties) ? requestedDifficulties : [requestedDifficulties]).filter(Boolean)[0];

    // Prefer the structured catalog whenever the query resolves to a covered
    // destination or trail. Generic Places remains a coverage fallback.
    if (searchType === 'hiking') {
      const catalogSearch = searchCatalog({ query, preferences, limit: 10 });
      if (catalogSearch) {
        return NextResponse.json({
          trails: catalogSearch.results.map(({ trail, score }) => toLegacySearchResult(trail, score, { lat, lng })),
          source: 'catalog',
          weather: null,
          entity: catalogSearch.entity,
          filters: catalogSearch.filters,
          attribution: 'Source: National Park Service',
        });
      }
    }

    const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }
    
    // Build Google Places search query
    let searchQuery = '';
    if (searchType === 'hiking') {
      searchQuery = buildHikingSearchQuery(query, preferences);
    } else if (searchType === 'food') {
      searchQuery = query || 'restaurant';
    }
    
    // Add location bias
    const location = `${lat},${lng}`;
    const radiusMeters = radius * 1609.34; // Convert miles to meters
    
    // Google Places Text Search API
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&location=${location}&radius=${radiusMeters}&key=${apiKey}`;
    
    const placesRes = await fetch(placesUrl);
    const placesData = await placesRes.json();
    
    if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
      console.error('Google Places error:', placesData.status);
      return NextResponse.json({ trails: [], source: 'fast', weather: null });
    }
    
    // Transform results to trail format
    let trails = (placesData.results || [])
      .filter(place => place.rating && place.rating >= 3.5)
      .map(place => ({
        name: place.name,
        placeId: place.place_id,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total || 0,
        distance: distanceMiles(lat, lng, place.geometry.location.lat, place.geometry.location.lng).toFixed(1),
        difficulty: searchType === 'hiking' ? (requestedDifficulty || 'Moderate') : null,
        length: searchType === 'hiking' ? '3-5 miles' : null,
        estimatedWeeklyVisitors: Math.floor((place.user_ratings_total || 100) * 1.5),
        features: searchType === 'hiking' ? ['Scenic', 'EasyParking'] : [],
        photos: place.photos?.map(p => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photo_reference}&key=${apiKey}`) || [],
        types: place.types || [],
        vicinity: place.vicinity || '',
        priceLevel: place.price_level || null,
      }));

    const specificTrails = trails.filter(trail => /trail|trailhead|dome|peak|falls|loop|ridge|point/i.test(trail.name));
    if (specificTrails.length >= 3) trails = trails.filter(trail => !/national park|state park$/i.test(trail.name));
    trails.sort((a, b) => {
      const aSpecific = /trail|trailhead|dome|peak|falls|loop|ridge|point/i.test(a.name) ? 1 : 0;
      const bSpecific = /trail|trailhead|dome|peak|falls|loop|ridge|point/i.test(b.name) ? 1 : 0;
      return bSpecific - aSpecific || parseFloat(a.distance) - parseFloat(b.distance);
    });
    trails = trails.slice(0, 10);
    
    return NextResponse.json({
      trails,
      source: 'fast',
      weather: null, // Fast search doesn't include weather
    });
    
  } catch (error) {
    console.error('Fast search error:', error);
    return NextResponse.json({ error: 'Fast search failed' }, { status: 500 });
  }
}
