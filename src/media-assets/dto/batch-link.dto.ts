import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class BatchLinkItemDto {
  @IsString()
  @MinLength(1)
  workId!: string;

  @IsString()
  @MinLength(8)
  sourceUrl!: string;

  @IsInt()
  @Min(1)
  durationSec!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  sourceType?: string;
}

export class BatchLinkDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchLinkItemDto)
  items!: BatchLinkItemDto[];
}
