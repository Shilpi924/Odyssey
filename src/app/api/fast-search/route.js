import { NextResponse } from 'next/server';

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

export async function POST(request) {
  try {
    const { lat, lng, query, preferences, radius = 25, priceRange } = await request.json();
    
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const searchType = getSearchType(query, preferences);
    
    // Build Google Places search query
    let searchQuery = '';
    if (searchType === 'hiking') {
      searchQuery = query || 'hiking trail';
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
    
    if (placesData.status !== 'OK') {
      console.error('Google Places error:', placesData.status);
      return NextResponse.json({ trails: [], source: 'fast', weather: null });
    }
    
    // Transform results to trail format
    const trails = placesData.results
      .filter(place => place.rating && place.rating >= 3.5)
      .slice(0, 10)
      .map(place => ({
        name: place.name,
        placeId: place.place_id,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total || 0,
        distance: distanceMiles(lat, lng, place.geometry.location.lat, place.geometry.location.lng).toFixed(1),
        difficulty: searchType === 'hiking' ? 'Moderate' : null,
        length: searchType === 'hiking' ? '3-5 miles' : null,
        estimatedWeeklyVisitors: Math.floor((place.user_ratings_total || 100) * 1.5),
        features: searchType === 'hiking' ? ['Scenic', 'EasyParking'] : [],
        photos: place.photos?.map(p => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photo_reference}&key=${apiKey}`) || [],
        types: place.types || [],
        vicinity: place.vicinity || '',
        priceLevel: place.price_level || null,
      }));
    
    // Sort by distance
    trails.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    
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
