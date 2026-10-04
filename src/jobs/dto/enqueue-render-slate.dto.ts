import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({
    description:
      'Renderer name. Empty, plain, or 0 uses the basic renderer. vhs selects the VHS subclass.',
    example: 'vhs',
  })
  @IsOptional()
  @IsString()
  look?: string;

  @ApiPropertyOptional({
    description: 'Same field as look. Prefer this name.',
    example: 'vhs',
  })
  @IsOptional()
  @IsString()
  renderer?: string;
}
