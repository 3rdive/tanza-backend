// src/cache/cache.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

@Injectable()
export class CacheService {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  constructor(@Inject(CACHE_MANAGER as any) private cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      console.log(`[Cache GET] Key: ${key} || Found: ${value !== undefined}`);
      return value;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl ? options.ttl * 1000 : undefined; // Convert to milliseconds
      console.log(
        `[Cache SET] Key: ${key} || TTL: ${ttl}ms (${options?.ttl}s)`,
      );
      await this.cacheManager.set(key, value, ttl);

      // // Verify the value was set
      // const verify = await this.cacheManager.get<T>(key);
      // console.log(
      //   `[Cache SET VERIFY] Key: ${key} || Stored: ${verify !== undefined}`,
      // );
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.keys(pattern);
      await Promise.all(keys.map((key) => this.del(key)));
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    try {
      // @ts-expect-error - reset method exists but not in the type definition
      await this.cacheManager.reset();
    } catch (error) {
      console.error('Cache reset error:', error);
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    try {
      // @ts-expect-error - store property exists but not in the type definition
      const store = this.cacheManager.store;

      // For in-memory cache, we need to get all keys manually
      if (typeof store === 'object' && 'keys' in store) {
        const allKeys = await (store as any).keys();
        if (!pattern) return allKeys;

        // Simple pattern matching for in-memory cache
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return allKeys.filter((key: string) => regex.test(key));
      }

      return [];
    } catch (error) {
      console.error('Cache keys error:', error);
      return [];
    }
  }

  /**
   * Wrap a function with caching logic
   * If cache exists, return it; otherwise execute function and cache result
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    try {
      // Try to get from cache
      const cached = await this.get<T>(key);
      if (cached !== undefined) {
        console.log(`[Cache RETRIEVED] Key: ${key}`);
        return cached;
      }

      // Execute function
      const result = await fn();

      // Cache the result
      await this.set(key, result, options);

      return result;
    } catch (error) {
      console.error(`Cache wrap error for key ${key}:`, error);
      // If caching fails, still return the function result
      return await fn();
    }
  }

  /**
   * Generate a cache key from multiple parts
   */
  generateKey(...parts: (string | number | boolean | undefined)[]): string {
    return parts
      .filter((part) => part !== undefined && part !== null)
      .map((part) => String(part))
      .join(':');
  }

  /**
   * Hash coordinates for cache key (reduces precision to avoid cache misses from minor differences)
   */
  hashCoordinates(lat: number, lon: number, precision: number = 4): string {
    return `${lat.toFixed(precision)},${lon.toFixed(precision)}`;
  }
}
