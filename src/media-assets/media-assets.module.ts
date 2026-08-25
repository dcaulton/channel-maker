import { Module } from '@nestjs/common';
import { MediaAssetsService } from './media-assets.service';
import { MediaAssetsController } from './media-assets.controller';

@Module({
  providers: [MediaAssetsService],
  controllers: [MediaAssetsController],
  exports: [MediaAssetsService],
})
export class MediaAssetsModule {}
