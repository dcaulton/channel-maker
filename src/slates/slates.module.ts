import { Module } from '@nestjs/common';
import { RenderSlateService } from './render-slate.service';

@Module({
  providers: [RenderSlateService],
  exports: [RenderSlateService],
})
export class SlatesModule {}
