import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class EnqueueRenderSlateDto {
  @ApiProperty({ example: 'cmtyz2gd900i06rb9wgc7orpw' })
  @IsString()
  @MinLength(1)
  channelId!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['idle', 'station-id', 'weather', 'upcoming'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  kinds?: string[];

  @ApiPropertyOptional({ enum: ['plain', 'vhs'], default: 'plain' })
  @IsOptional()
  @IsIn(['plain', 'vhs'])
  look?: 'plain' | 'vhs';
}
