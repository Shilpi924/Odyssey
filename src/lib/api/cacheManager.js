/**
 * Cache Manager for API responses
 * Reduces API costs and improves performance through intelligent caching
 */

export class CacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes default
    this.costTracker = {
      totalCalls: 0,
      cachedHits: 0,
      cacheMisses: 0,
      estimatedCost: 0,
      byService: {},
    };
    this.costPerCall = options.costPerCall || {
      claude: 0.01, // $0.01 per call
      googlePlaces: 0.005, // $0.005 per call
      weather: 0.001, // $0.001 per call
      geocoding: 0.005, // $0.005 per call
    };
  }

  /**
   * Generate cache key from request parameters
   */
  generateKey(service, params) {
    const paramString = JSON.stringify(params);
    return `${service}:${paramString}`;
  }

  /**
   * Get cached response
   */
  get(service, params) {
    const key = this.generateKey(service, params);
    const cached = this.cache.get(key);

    if (!cached) {
      this.costTracker.cacheMisses++;
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      this.costTracker.cacheMisses++;
      return null;
    }

    this.costTracker.cachedHits++;
    console.log(`Cache hit for ${service}`);
    return cached.data;
  }

  /**
   * Set cached response
   */
  set(service, params, data, ttl = this.defaultTTL) {
    const key = this.generateKey(service, params);
    
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      service,
    });
  }

  /**
   * Clear cache for a specific service or all
   */
  clear(service = null) {
    if (service) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(service + ':')) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Track API call for cost estimation
   */
  trackCall(service) {
    this.costTracker.totalCalls++;
    
    if (!this.costTracker.byService[service]) {
      this.costTracker.byService[service] = {
        calls: 0,
        cost: 0,
      };
    }
    
    this.costTracker.byService[service].calls++;
    this.costTracker.byService[service].cost += this.costPerCall[service] || 0;
    this.costTracker.estimatedCost += this.costPerCall[service] || 0;
  }

  /**
   * Get cost statistics
   */
  getCostStats() {
    const hitRate = this.costTracker.totalCalls > 0
      ? (this.costTracker.cachedHits / this.costTracker.totalCalls * 100).toFixed(2)
      : 0;
    
    const savings = this.costTracker.cachedHits > 0
      ? this.costTracker.cachedHits * 0.01 // Assume $0.01 average per cached call
      : 0;

    return {
      ...this.costTracker,
      hitRate: `${hitRate}%`,
      estimatedSavings: `$${savings.toFixed(2)}`,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Log cost statistics
   */
  logCostStats() {
    const stats = this.getCostStats();
    console.log('=== Cache & Cost Statistics ===');
    console.log(`Total API calls: ${stats.totalCalls}`);
    console.log(`Cache hits: ${stats.cachedHits}`);
    console.log(`Cache misses: ${stats.cacheMisses}`);
    console.log(`Hit rate: ${stats.hitRate}`);
    console.log(`Estimated cost: $${stats.estimatedCost.toFixed(4)}`);
    console.log(`Estimated savings: ${stats.estimatedSavings}`);
    console.log(`Cache size: ${stats.cacheSize}/${this.maxSize}`);
    console.log('By service:', stats.byService);
  }

  /**
   * Check if cache is healthy
   */
  isCacheHealthy() {
    return this.cache.size < this.maxSize * 0.9;
  }

  /**
   * Get cache size percentage
   */
  getCacheUsage() {
    return (this.cache.size / this.maxSize * 100).toFixed(2);
  }
}

// Singleton instance
export const cacheManager = new CacheManager({
  maxSize: 200,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  costPerCall: {
    claude: 0.015, // $0.015 per call
    googlePlaces: 0.005, // $0.005 per call
    weather: 0.001, // $0.001 per call
    geocoding: 0.005, // $0.005 per call
  },
});

/**
 * Wrapper function for API calls with caching
 */
export async function withCache(service, apiCall, params, options = {}) {
  const { ttl, forceRefresh = false } = options;

  // Check cache first
  if (!forceRefresh) {
    const cached = cacheManager.get(service, params);
    if (cached) {
      return cached;
    }
  }

  // Track API call
  cacheManager.trackCall(service);

  // Make API call
  try {
    const result = await apiCall(params);
    
    // Cache the result
    cacheManager.set(service, params, result, ttl);
    
    return result;
  } catch (error) {
    console.error(`API call failed for ${service}:`, error);
    throw error;
  }
}

/**
 * React hook for using cache manager
 */
export function useCache() {
  return {
    get: (service, params) => cacheManager.get(service, params),
    set: (service, params, data, ttl) => cacheManager.set(service, params, data, ttl),
    clear: (service) => cacheManager.clear(service),
    getStats: () => cacheManager.getCostStats(),
    logStats: () => cacheManager.logCostStats(),
    isHealthy: () => cacheManager.isCacheHealthy(),
    getUsage: () => cacheManager.getCacheUsage(),
  };
}

/**
 * Cost control middleware
 */
export class CostController {
  constructor(options = {}) {
    this.dailyBudget = options.dailyBudget || 10; // $10 default daily budget
    this.dailySpent = 0;
    this.resetTime = new Date().setHours(24, 0, 0, 0);
    this.alertThreshold = options.alertThreshold || 0.8; // Alert at 80% of budget
    this.blockThreshold = options.blockThreshold || 1.0; // Block at 100% of budget
  }

  /**
   * Check if call is allowed based on budget
   */
  canMakeCall(cost = 0) {
    // Reset daily spent if new day
    if (Date.now() > this.resetTime) {
      this.dailySpent = 0;
      this.resetTime = new Date().setHours(24, 0, 0, 0);
    }

    const totalAfterCall = this.dailySpent + cost;
    const budgetUsage = totalAfterCall / this.dailyBudget;

    if (budgetUsage >= this.blockThreshold) {
      console.warn('Daily budget exceeded, blocking call');
      return { allowed: false, reason: 'budget_exceeded', budgetUsage };
    }

    if (budgetUsage >= this.alertThreshold) {
      console.warn(`Budget usage at ${(budgetUsage * 100).toFixed(1)}%`);
      return { allowed: true, reason: 'budget_warning', budgetUsage };
    }

    return { allowed: true, reason: 'ok', budgetUsage };
  }

  /**
   * Record cost of a call
   */
  recordCost(cost) {
    this.dailySpent += cost;
  }

  /**
   * Get budget status
   */
  getBudgetStatus() {
    const usage = this.dailySpent / this.dailyBudget;
    return {
      dailyBudget: this.dailyBudget,
      dailySpent: this.dailySpent,
      remaining: this.dailyBudget - this.dailySpent,
      usage: `${(usage * 100).toFixed(1)}%`,
      resetTime: new Date(this.resetTime).toLocaleString(),
    };
  }
}

// Singleton instance
export const costController = new CostController({
  dailyBudget: 10, // $10 daily budget
  alertThreshold: 0.8,
  blockThreshold: 1.0,
});

/**
 * Wrapper function with cost control
 */
export async function withCostControl(service, apiCall, params, cost = 0) {
  const { allowed, reason, budgetUsage } = costController.canMakeCall(cost);

  if (!allowed) {
    throw new Error(`API call blocked: ${reason}. Budget usage: ${(budgetUsage * 100).toFixed(1)}%`);
  }

  try {
    const result = await apiCall(params);
    costController.recordCost(cost);
    return result;
  } catch (error) {
    console.error(`API call failed for ${service}:`, error);
    throw error;
  }
}
