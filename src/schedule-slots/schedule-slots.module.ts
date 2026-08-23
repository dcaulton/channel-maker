import { Module } from '@nestjs/common';
import { ScheduleSlotsService } from './schedule-slots.service';
import { ScheduleSlotsController } from './schedule-slots.controller';

@Module({
  controllers: [ScheduleSlotsController],
  providers: [ScheduleSlotsService],
  exports: [ScheduleSlotsService],
})
export class ScheduleSlotsModule {}
