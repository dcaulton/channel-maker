import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BACKGROUND_QUEUE } from './jobs.constants';
import { JobsService } from './jobs.service';
import { JobsProcessor } from './jobs.processor';
import { JobsEvents } from './jobs.events';
import { JobsController } from './jobs.controller';
import { TvhModule } from '../tvheadend/tvh.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: BACKGROUND_QUEUE,
    }),
    TvhModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, JobsProcessor, JobsEvents],
  exports: [JobsService],
})
export class JobsModule {}
