/**
 * Fallback handler for API failures
 * Provides graceful degradation when external services are unavailable
 */

export class APIFallbackHandler {
  constructor() {
    this.fallbacks = {
      claude: this.claudeFallback.bind(this),
      googlePlaces: this.googlePlacesFallback.bind(this),
      weather: this.weatherFallback.bind(this),
      geocoding: this.geocodingFallback.bind(this),
      gps: this.gpsFallback.bind(this),
      offlineMap: this.offlineMapFallback.bind(this),
      indexedDB: this.indexedDBFallback.bind(this),
      auth: this.authFallback.bind(this),
    };
  }

  /**
   * Handle Claude API unavailability
   */
  claudeFallback(originalRequest) {
    console.warn('Claude API unavailable, using fallback');
    
    // Return deterministic results based on filters
    const { location, difficulty, features, maxLength } = originalRequest;
    
    return {
      recommendations: [],
      message: 'AI personalization is temporarily unavailable. Showing results based on your selected filters.',
      fallback: true,
      source: 'filter-based',
    };
  }

  /**
   * Handle Google Places quota exceeded
   */
  googlePlacesFallback(originalRequest) {
    console.warn('Google Places quota exceeded, using cached or fallback data');
    
    return {
      places: [],
      message: 'Place search is temporarily limited. Try a more specific query or try again later.',
      fallback: true,
      source: 'cache',
    };
  }

  /**
   * Handle Weather API unavailability
   */
  weatherFallback(originalRequest) {
    console.warn('Weather API unavailable, using default conditions');
    
    return {
      weather: {
        condition: 'Unknown',
        temp: '--',
        forecast: 'Weather data unavailable',
        icon: '❓',
      },
      message: 'Weather information is temporarily unavailable.',
      fallback: true,
    };
  }

  /**
   * Handle Geocoding API failure
   */
  geocodingFallback(originalRequest) {
    console.warn('Geocoding failed, using approximate location');
    
    return {
      coordinates: null,
      message: 'Could not determine precise location. Please try a more specific location name.',
      fallback: true,
    };
  }

  /**
   * Handle GPS permission denied or unavailable
   */
  gpsFallback(originalRequest) {
    console.warn('GPS unavailable, using manual location entry');
    
    return {
      location: null,
      message: 'Location services are disabled. Please enter your location manually.',
      fallback: true,
    };
  }

  /**
   * Handle offline map download interruption
   */
  offlineMapFallback(originalRequest) {
    console.warn('Offline map download interrupted');
    
    return {
      downloaded: false,
      message: 'Map download was interrupted. Please try again with a better connection.',
      fallback: true,
    };
  }

  /**
   * Handle IndexedDB storage full
   */
  indexedDBFallback(originalRequest) {
    console.warn('IndexedDB storage full');
    
    return {
      saved: false,
      message: 'Storage is full. Please clear some saved trails to make space.',
      fallback: true,
    };
  }

  /**
   * Handle authentication failure
   */
  authFallback(originalRequest) {
    console.warn('Authentication failed');
    
    return {
      authenticated: false,
      message: 'Authentication is temporarily unavailable. Some features may be limited.',
      fallback: true,
    };
  }

  /**
   * Generic fallback handler
   */
  handle(service, originalRequest, error) {
    const fallback = this.fallbacks[service];
    
    if (fallback) {
      try {
        return fallback(originalRequest);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return this.genericFallback(originalRequest, error);
      }
    }
    
    return this.genericFallback(originalRequest, error);
  }

  /**
   * Generic fallback when no specific handler exists
   */
  genericFallback(originalRequest, error) {
    return {
      data: null,
      message: 'Service is temporarily unavailable. Please try again later.',
      fallback: true,
      error: error?.message || 'Unknown error',
    };
  }

  /**
   * Check if a result is from a fallback
   */
  isFallback(result) {
    return result?.fallback === true;
  }

  /**
   * Get user-friendly message for fallback
   */
  getFallbackMessage(result) {
    if (!this.isFallback(result)) return null;
    return result.message || 'Service temporarily unavailable';
  }
}

// Singleton instance
export const fallbackHandler = new APIFallbackHandler();

/**
 * Wrapper function for API calls with automatic fallback
 */
export async function withFallback(service, apiCall, originalRequest) {
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    console.error(`API call failed for ${service}:`, error);
    return fallbackHandler.handle(service, originalRequest, error);
  }
}

/**
 * React hook for using fallback handler
 */
export function useFallback() {
  return {
    handle: (service, originalRequest, error) => 
      fallbackHandler.handle(service, originalRequest, error),
    isFallback: (result) => fallbackHandler.isFallback(result),
    getMessage: (result) => fallbackHandler.getFallbackMessage(result),
  };
}
