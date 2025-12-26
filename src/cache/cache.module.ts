// src/cache/cache.module.ts
import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const redisHost = configService.get('REDIS_HOST', 'localhost');
        const redisPort = configService.get('REDIS_PORT', 6379);

        // Use Redis only if explicitly configured, otherwise use in-memory
        if (isProduction && redisHost !== 'localhost') {
          return {
            store: await redisStore({
              socket: {
                host: redisHost,
                port: redisPort,
              },
              ttl: 3600, // default TTL in seconds (1 hour)
            }),
          };
        }

        // In-memory cache for development or when Redis is not configured
        return {
          ttl: 3600, // default TTL in seconds (1 hour)
          max: 1000, // maximum number of items in cache
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
