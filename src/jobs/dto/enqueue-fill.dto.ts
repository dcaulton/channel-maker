export class EnqueueFillDto {
  @IsString()
  @MinLength(1)
  channelSlug!: string;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
