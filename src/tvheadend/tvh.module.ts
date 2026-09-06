import { Module } from '@nestjs/common';
import { TvhSyncService } from './tvh-sync.service';

@Module({
  providers: [TvhSyncService],
  exports: [TvhSyncService],
})
export class TvhModule {}
