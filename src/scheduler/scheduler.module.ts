import { Module } from '@nestjs/common';
import { SlatesModule } from '../slates/slates.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [SlatesModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
