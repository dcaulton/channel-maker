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
import { RulesetsService } from './rulesets.service';
import { CreateRulesetDto } from './dto/create-ruleset.dto';
import { UpdateRulesetDto } from './dto/update-ruleset.dto';

@ApiTags('rulesets')
@Controller('rulesets')
export class RulesetsController {
  constructor(private readonly rulesetsService: RulesetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a ruleset' })
  @ApiCreatedResponse({ description: 'Ruleset created' })
  create(@Body() dto: CreateRulesetDto) {
    return this.rulesetsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List rulesets' })
  @ApiOkResponse({ description: 'List of rulesets' })
  findAll() {
    return this.rulesetsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ruleset (includes rules and bindings)' })
  @ApiOkResponse({ description: 'Ruleset found' })
  @ApiNotFoundResponse({ description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.rulesetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a ruleset' })
  @ApiOkResponse({ description: 'Updated' })
  @ApiNotFoundResponse({ description: 'Not found' })
  update(@Param('id') id: string, @Body() dto: UpdateRulesetDto) {
    return this.rulesetsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a ruleset (rules and bindings cascade)',
  })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Not found' })
  remove(@Param('id') id: string) {
    return this.rulesetsService.remove(id);
  }
}
