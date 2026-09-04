import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class EnqueueLlmDto {
  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxx' })
  @IsString()
  @MinLength(1)
  workId: string;

  @ApiPropertyOptional({ example: 'Write a one-line synopsis' })
  @IsOptional()
  @IsString()
  prompt?: string;
}
