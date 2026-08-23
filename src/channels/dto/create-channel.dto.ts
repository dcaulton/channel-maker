import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateChannelDto {
  @ApiProperty({ example: 'Classic Movies' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    example: 'classic-movies',
    description: 'URL-safe unique identifier',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;

  @ApiPropertyOptional({ example: 'Golden-age films and serials' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
