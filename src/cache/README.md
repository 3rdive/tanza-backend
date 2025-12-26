# Cache Module

A comprehensive caching solution for the Tanza Backend that supports both in-memory and Redis caching strategies.

## Features

- **In-memory caching** by default (no external dependencies required)
- **Redis support** for production environments
- **Automatic fallback** to in-memory cache when Redis is not configured
- **Type-safe** cache operations
- **Flexible TTL** (Time To Live) configuration per cache entry
- **Pattern-based cache invalidation**
- **Wrap function** for easy integration with existing methods

## Configuration

The cache module automatically determines which caching strategy to use based on environment variables:

### In-Memory Cache (Default)

No configuration needed. The in-memory cache is used by default with the following settings:

- Default TTL: 3600 seconds (1 hour)
- Max items: 1000

### Redis Cache (Production)

Set the following environment variables in your `.env` file:

```bash
NODE_ENV=production
REDIS_HOST=your-redis-host
REDIS_PORT=6379
```

## Usage

### Basic Operations

```typescript
import { CacheService } from '../cache/cache.service';

@Injectable()
export class YourService {
  constructor(private readonly cacheService: CacheService) {}

  async example() {
    // Set a value
    await this.cacheService.set('key', { data: 'value' }, { ttl: 3600 });

    // Get a value
    const value = await this.cacheService.get('key');

    // Delete a value
    await this.cacheService.del('key');

    // Clear all cache
    await this.cacheService.reset();
  }
}
```

### Using the Wrap Function (Recommended)

The `wrap` function is the easiest way to add caching to existing methods:

```typescript
async getData(id: string) {
  const cacheKey = this.cacheService.generateKey('data', id);

  return this.cacheService.wrap(
    cacheKey,
    async () => {
      // This function only runs if cache misses
      return await this.expensiveOperation(id);
    },
    { ttl: 3600 } // Cache for 1 hour
  );
}
```

### Pattern-Based Operations

```typescript
// Delete all keys matching a pattern
await this.cacheService.delPattern('user:*');

// Get all keys matching a pattern
const keys = await this.cacheService.keys('order:*');
```

### Helper Methods

```typescript
// Generate a cache key from multiple parts
const key = this.cacheService.generateKey('user', userId, 'profile');
// Result: "user:123:profile"

// Hash coordinates for location-based caching
const coordsHash = this.cacheService.hashCoordinates(40.7128, -74.006, 4);
// Result: "40.7128,-74.0060" (rounded to 4 decimal places)
```

## Implementation in Location Service

The location service implements extensive caching for all external API calls:

### Location Search

- **Cache Key**: `location:search:{query}`
- **TTL**: 7 days
- **Reason**: Location searches are relatively stable and don't change often

### Reverse Geocoding

- **Cache Key**: `location:reverse:{lat},{lon}`
- **TTL**: 30 days
- **Reason**: Coordinates to address mappings rarely change

### Distance Calculation

- **Cache Key**: `location:distance:{mode}:{startLat},{startLon}:{endLat},{endLon}`
- **TTL**: 7 days
- **Reason**: Distance calculations between fixed points are stable

### Place Details

- **Cache Key**: `location:place-details:{placeId}`
- **TTL**: 7 days
- **Reason**: Individual place details are stable

## Benefits

1. **Reduced API Costs**: Dramatically reduces calls to Google Maps and OpenRouteService APIs
2. **Improved Performance**: Cached responses are returned instantly
3. **Better User Experience**: Faster response times for repeated queries
4. **Resilience**: In-memory cache works without any external dependencies
5. **Scalability**: Easy switch to Redis for distributed caching when needed

## Cache Invalidation

Cache entries automatically expire based on their TTL. For manual invalidation:

```typescript
// Clear specific entry
await this.cacheService.del('location:search:new york');

// Clear all location searches
await this.cacheService.delPattern('location:search:*');

// Clear all cache
await this.cacheService.reset();
```

## Monitoring

The cache service logs errors for debugging:

- Cache get/set failures
- Pattern deletion errors
- Connection issues (for Redis)

All cache operations are wrapped in try-catch blocks to ensure that cache failures don't break your application - the original function will still execute even if caching fails.

## Best Practices

1. **Choose appropriate TTLs**: Balance between freshness and cache hit rate
2. **Use coordinate hashing**: For location-based queries, use `hashCoordinates()` to round coordinates for better cache hits
3. **Generate consistent keys**: Use `generateKey()` to ensure consistent key formatting
4. **Handle cache misses gracefully**: The wrap function does this automatically
5. **Monitor cache hit rates**: Log cache hits/misses to optimize TTL values
