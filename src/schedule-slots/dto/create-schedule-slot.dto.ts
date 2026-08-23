import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateScheduleSlotDto {
  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxx' })
  @IsString()
  channelId: string;

  @ApiProperty({ example: 'Night Owl Cinema' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ example: 'A double feature of noir classics' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-08-23T23:00:00.000Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-08-24T01:00:00.000Z' })
  @IsDateString()
  endsAt: string;
}
