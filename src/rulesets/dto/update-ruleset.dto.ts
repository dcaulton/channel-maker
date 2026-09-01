import { PartialType } from '@nestjs/swagger';
import { CreateRulesetDto } from './create-ruleset.dto';

export class UpdateRulesetDto extends PartialType(CreateRulesetDto) {}
