import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRuleDto {
  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxx' })
  @IsString()
  rulesetId: string;

  @ApiProperty({ example: 'Rotate three TVH streams in 2h blocks' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    example: 'rotate-tv-streams',
    description:
      'rotate-tv-streams | no-repeat-episode | catalog-allowlist | llm | suggest',
  })
  @IsString()
  @MinLength(1)
  kind: string;

  @ApiPropertyOptional({ example: 'local', default: 'local' })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  honorGlobals?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({
    example: {
      streamTitles: ['WLS', 'ME-TV', 'WTTW'],
      slotDurationSec: 7200,
    },
  })
  @IsObject()
  payload: Record<string, unknown>;
}
