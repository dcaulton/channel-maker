import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateScheduleSlotDto } from './create-schedule-slot.dto';

// channelId is fixed after creation; allow updating the rest
export class UpdateScheduleSlotDto extends PartialType(
  OmitType(CreateScheduleSlotDto, ['channelId'] as const),
) {}
