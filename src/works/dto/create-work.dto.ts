import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateWorkDto {
  @ApiProperty({ example: 'The Maltese Falcon' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({
    example: 'movie',
    default: 'movie',
    description: 'movie | episode | series | other',
  })
  @IsOptional()
  @IsString()
  kind?: string;

  @ApiPropertyOptional({ example: 1941 })
  @IsOptional()
  @IsInt()
  @Min(1870)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 'film-noir' })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  synopsis?: string;

  @ApiPropertyOptional({
    example: 'The Twilight Zone',
    description: 'Parent series title when kind is episode',
  })
  @IsOptional()
  @IsString()
  seriesTitle?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  season?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  episode?: number;

  @ApiPropertyOptional({
    example: { imdb: 'tt0033870' },
    description: 'Loose bag for future external ids',
  })
  @IsOptional()
  @IsObject()
  externalIds?: Record<string, unknown>;
}
