import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateRuleDto } from './create-rule.dto';

export class UpdateRuleDto extends PartialType(
  OmitType(CreateRuleDto, ['rulesetId'] as const),
) {
  @ApiPropertyOptional({
    description: 'Move this rule to another ruleset',
  })
  @IsOptional()
  @IsString()
  rulesetId?: string;
}
