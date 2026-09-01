import { Module } from '@nestjs/common';
import { RulesetsService } from './rulesets.service';
import { RulesetsController } from './rulesets.controller';
import { RulesService } from './rules.service';
import { RulesController } from './rules.controller';
import { ChannelRulesetsService } from './channel-rulesets.service';
import { ChannelRulesetsController } from './channel-rulesets.controller';

@Module({
  providers: [RulesetsService, RulesService, ChannelRulesetsService],
  controllers: [RulesetsController, RulesController, ChannelRulesetsController],
  exports: [RulesetsService, RulesService, ChannelRulesetsService],
})
export class RulesetsModule {}
