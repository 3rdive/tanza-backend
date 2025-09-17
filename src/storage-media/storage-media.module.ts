import { Module } from '@nestjs/common';
import { StorageMediaService } from './storage-media.service';
import { StorageMediaController } from './storage-media.controller';

@Module({
  controllers: [StorageMediaController],
  providers: [StorageMediaService],
  exports: [StorageMediaService],
})
export class StorageMediaModule {}
