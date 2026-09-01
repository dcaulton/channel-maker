import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateRulesetDto {
  @ApiProperty({ example: 'WLS / ME-TV / WTTW 2h rotation' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'wls-metv-wttw' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'sequential',
    default: 'sequential',
    description: 'sequential | first-match',
  })
  @IsOptional()
  @IsString()
  applyMode?: string;
}
