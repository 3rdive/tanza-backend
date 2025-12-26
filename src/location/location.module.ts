import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { CacheModule } from '../cache/cache.module';

@Module({
  providers: [LocationService],
  controllers: [LocationController],
  exports: [LocationService],
  imports: [CacheModule],
})
export class LocationModule {}
