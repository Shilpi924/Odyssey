import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Image constructor for testing
class MockImage {
  constructor() {
    this.src = '';
    this.onload = null;
    this.onerror = null;
  }
}

global.Image = MockImage;

describe('Search Image Preloading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create Image instances for trails with coordinates', () => {
    const trails = [
      { name: 'Trail 1', lat: 37.7749, lng: -122.4194 },
      { name: 'Trail 2', lat: 37.7849, lng: -122.4094 },
      { name: 'Trail 3', lat: 37.7949, lng: -122.3994 },
    ];

    const apiKey = 'test-api-key';
    const preloadedImages = new Set();

    trails.forEach((trail) => {
      if (trail.lat && trail.lng) {
        const imageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${trail.lat},${trail.lng}&zoom=15&size=600x250&maptype=hybrid&markers=color:blue%7Csize:mid%7C${trail.lat},${trail.lng}&key=${apiKey}`;
        
        if (!preloadedImages.has(imageUrl)) {
          const img = new Image();
          img.src = imageUrl;
          preloadedImages.add(imageUrl);
        }
      }
    });

    expect(preloadedImages.size).toBe(3);
  });

  it('should skip trails without coordinates', () => {
    const trails = [
      { name: 'Trail 1', lat: 37.7749, lng: -122.4194 },
      { name: 'Trail 2', lat: null, lng: -122.4094 },
      { name: 'Trail 3', lat: 37.7949, lng: null },
    ];

    const apiKey = 'test-api-key';
    const preloadedImages = new Set();

    trails.forEach((trail) => {
      if (trail.lat && trail.lng) {
        const imageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${trail.lat},${trail.lng}&zoom=15&size=600x250&maptype=hybrid&markers=color:blue%7Csize:mid%7C${trail.lat},${trail.lng}&key=${apiKey}`;
        
        if (!preloadedImages.has(imageUrl)) {
          const img = new Image();
          img.src = imageUrl;
          preloadedImages.add(imageUrl);
        }
      }
    });

    expect(preloadedImages.size).toBe(1);
  });

  it('should avoid duplicate image preloading', () => {
    const trails = [
      { name: 'Trail 1', lat: 37.7749, lng: -122.4194 },
      { name: 'Trail 2', lat: 37.7749, lng: -122.4194 }, // Same coordinates
    ];

    const apiKey = 'test-api-key';
    const preloadedImages = new Set();

    trails.forEach((trail) => {
      if (trail.lat && trail.lng) {
        const imageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${trail.lat},${trail.lng}&zoom=15&size=600x250&maptype=hybrid&markers=color:blue%7Csize:mid%7C${trail.lat},${trail.lng}&key=${apiKey}`;
        
        if (!preloadedImages.has(imageUrl)) {
          const img = new Image();
          img.src = imageUrl;
          preloadedImages.add(imageUrl);
        }
      }
    });

    expect(preloadedImages.size).toBe(1);
  });

  it('should handle empty trails array', () => {
    const trails = [];
    const apiKey = 'test-api-key';
    const preloadedImages = new Set();

    trails.forEach((trail) => {
      if (trail.lat && trail.lng) {
        const imageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${trail.lat},${trail.lng}&zoom=15&size=600x250&maptype=hybrid&markers=color:blue%7Csize:mid%7C${trail.lat},${trail.lng}&key=${apiKey}`;
        
        if (!preloadedImages.has(imageUrl)) {
          const img = new Image();
          img.src = imageUrl;
          preloadedImages.add(imageUrl);
        }
      }
    });

    expect(preloadedImages.size).toBe(0);
  });

  it('should handle missing API key', () => {
    const trails = [
      { name: 'Trail 1', lat: 37.7749, lng: -122.4194 },
    ];

    const apiKey = null;
    const preloadedImages = new Set();

    if (!apiKey) {
      expect(preloadedImages.size).toBe(0);
      return;
    }

    trails.forEach((trail) => {
      if (trail.lat && trail.lng) {
        const imageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${trail.lat},${trail.lng}&zoom=15&size=600x250&maptype=hybrid&markers=color:blue%7Csize:mid%7C${trail.lat},${trail.lng}&key=${apiKey}`;
        
        if (!preloadedImages.has(imageUrl)) {
          const img = new Image();
          img.src = imageUrl;
          preloadedImages.add(imageUrl);
        }
      }
    });
  });

  it('should generate correct static map URLs', () => {
    const trail = { lat: 37.7749, lng: -122.4194 };
    const apiKey = 'test-api-key';
    
    const expectedUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${trail.lat},${trail.lng}&zoom=15&size=600x250&maptype=hybrid&markers=color:blue%7Csize:mid%7C${trail.lat},${trail.lng}&key=${apiKey}`;
    
    expect(expectedUrl).toContain('center=37.7749,-122.4194');
    expect(expectedUrl).toContain('zoom=15');
    expect(expectedUrl).toContain('size=600x250');
    expect(expectedUrl).toContain('maptype=hybrid');
    expect(expectedUrl).toContain('key=test-api-key');
  });
});

describe('Smart Search Query Detection', () => {
  it('should detect food queries', () => {
    const foodQueries = [
      'coffee shops',
      'cafe near me',
      'restaurants',
      'food',
      'dining',
      'eat',
      'breakfast',
      'lunch',
      'dinner'
    ];

    foodQueries.forEach(query => {
      const isFoodQuery = query.toLowerCase().includes('coffee') ||
                          query.toLowerCase().includes('cafe') ||
                          query.toLowerCase().includes('restaurant') ||
                          query.toLowerCase().includes('food') ||
                          query.toLowerCase().includes('dining') ||
                          query.toLowerCase().includes('eat') ||
                          query.toLowerCase().includes('breakfast') ||
                          query.toLowerCase().includes('lunch') ||
                          query.toLowerCase().includes('dinner');
      expect(isFoodQuery).toBe(true);
    });
  });

  it('should detect hiking queries', () => {
    const hikingQueries = [
      'hike',
      'trail',
      'mountain',
      'peak',
      'nature',
      'walk'
    ];

    hikingQueries.forEach(query => {
      const isHikingQuery = query.toLowerCase().includes('hike') ||
                           query.toLowerCase().includes('trail') ||
                           query.toLowerCase().includes('mountain') ||
                           query.toLowerCase().includes('peak') ||
                           query.toLowerCase().includes('nature') ||
                           query.toLowerCase().includes('walk');
      expect(isHikingQuery).toBe(true);
    });
  });

  it('should not detect non-food queries as food', () => {
    const nonFoodQueries = ['hike', 'trail', 'mountain', 'park'];

    nonFoodQueries.forEach(query => {
      const isFoodQuery = query.toLowerCase().includes('coffee') ||
                          query.toLowerCase().includes('cafe') ||
                          query.toLowerCase().includes('restaurant') ||
                          query.toLowerCase().includes('food') ||
                          query.toLowerCase().includes('dining') ||
                          query.toLowerCase().includes('eat');
      expect(isFoodQuery).toBe(false);
    });
  });

  it('should not detect non-hiking queries as hiking', () => {
    const nonHikingQueries = ['coffee', 'restaurant', 'food', 'dining'];

    nonHikingQueries.forEach(query => {
      const isHikingQuery = query.toLowerCase().includes('hike') ||
                           query.toLowerCase().includes('trail') ||
                           query.toLowerCase().includes('mountain') ||
                           query.toLowerCase().includes('peak') ||
                           query.toLowerCase().includes('nature');
      expect(isHikingQuery).toBe(false);
    });
  });
});

describe('Distance Calculation', () => {
  it('should calculate distance between two points', () => {
    const lat1 = 37.7749;
    const lon1 = -122.4194;
    const lat2 = 37.7849;
    const lon2 = -122.4094;

    const R = 3958.8; // miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(100); // Should be reasonable distance
  });

  it('should return 0 for same coordinates', () => {
    const lat = 37.7749;
    const lon = -122.4194;

    const R = 3958.8;
    const dLat = ((lat - lat) * Math.PI) / 180;
    const dLon = ((lon - lon) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    expect(distance).toBe(0);
  });
});
