import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ChannelRulesetsService } from './channel-rulesets.service';
import { CreateChannelRulesetDto } from './dto/create-channel-ruleset.dto';
import { UpdateChannelRulesetDto } from './dto/update-channel-ruleset.dto';

@ApiTags('channel-rulesets')
@Controller('channel-rulesets')
export class ChannelRulesetsController {
  constructor(
    private readonly channelRulesetsService: ChannelRulesetsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Bind a ruleset to a channel' })
  @ApiCreatedResponse({ description: 'Binding created' })
  create(@Body() dto: CreateChannelRulesetDto) {
    return this.channelRulesetsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List channel ↔ ruleset bindings' })
  @ApiOkResponse({ description: 'List of bindings' })
  findAll() {
    return this.channelRulesetsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a binding by id' })
  @ApiOkResponse({ description: 'Binding found' })
  @ApiNotFoundResponse({ description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.channelRulesetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update binding priority / active window' })
  @ApiOkResponse({ description: 'Updated' })
  @ApiNotFoundResponse({ description: 'Not found' })
  update(@Param('id') id: string, @Body() dto: UpdateChannelRulesetDto) {
    return this.channelRulesetsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unbind a ruleset from a channel' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Not found' })
  remove(@Param('id') id: string) {
    return this.channelRulesetsService.remove(id);
  }
}
