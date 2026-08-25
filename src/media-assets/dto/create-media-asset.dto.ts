import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateMediaAssetDto {
  @ApiProperty({ example: 'The Maltese Falcon' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({
    example: 'https://nas.local/media/movies/maltese-falcon.mkv',
    description: 'File path or HTTP(S) URL',
  })
  @IsString()
  @MinLength(1)
  sourceUrl: string;

  @ApiPropertyOptional({ example: 'file', default: 'file' })
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional({ example: 6000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationSec?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  needsVpn?: boolean;

  @ApiPropertyOptional({ example: 'GB' })
  @ValidateIf((o: CreateMediaAssetDto) => o.needsVpn === true)
  @IsString()
  @MinLength(2)
  vpnCountry?: string;
}
