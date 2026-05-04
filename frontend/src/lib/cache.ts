import { logger } from './logger';

/**
 * Simple in-memory cache for API responses
 * Prevents unnecessary refetching when navigating between pages
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // milliseconds
}

class DataCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Set data in cache with expiration time
   * @param key - Cache key
   * @param data - Data to cache
   * @param expiresIn - Time in milliseconds until cache expires (default: 5 minutes)
   */
  set<T>(key: string, data: T, expiresIn: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    });
  }

  /**
   * Get data from cache if not expired
   * @param key - Cache key
   * @returns Cached data or null if expired/not found
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > entry.expiresIn;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if cache has valid (non-expired) data for key
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear specific cache entry
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Clear all cache entries matching a pattern
   */
  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const dataCache = new DataCache();

/**
 * Calculate milliseconds until midnight (local time)
 * @returns Milliseconds until next midnight
 */
export function getMillisecondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // Next day
    0, 0, 0, 0 // Midnight
  );
  return midnight.getTime() - now.getTime();
}

/**
 * Helper function to create cache-aware API calls
 * @param key - Cache key
 * @param fetcher - Function that fetches data
 * @param expiresIn - Cache expiration time in milliseconds
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  expiresIn?: number
): Promise<T> {
  // Check cache first
  const cached = dataCache.get<T>(key);
  if (cached !== null) {
    logger.log(`[Cache] Hit: ${key}`);
    return cached;
  }

  // Fetch fresh data
  logger.log(`[Cache] Miss: ${key} - fetching...`);
  const data = await fetcher();
  
  // Store in cache
  dataCache.set(key, data, expiresIn);
  
  return data;
}
