import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class EnqueueFillDto {
  @IsString()
  @MinLength(1)
  channelSlug!: string;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
