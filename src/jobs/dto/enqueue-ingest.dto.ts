import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class EnqueueIngestDto {
  @ApiPropertyOptional({
    example: '/mnt/nas/media/movies',
    description: 'Ignored by the stub; real ingest will walk this path',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  root?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
