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
import { RulesService } from './rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@ApiTags('rules')
@Controller('rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a rule on a ruleset' })
  @ApiCreatedResponse({ description: 'Rule created' })
  create(@Body() dto: CreateRuleDto) {
    return this.rulesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List rules' })
  @ApiOkResponse({ description: 'List of rules' })
  findAll() {
    return this.rulesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a rule by id' })
  @ApiOkResponse({ description: 'Rule found' })
  @ApiNotFoundResponse({ description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.rulesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a rule (payload, enabled, order, …)' })
  @ApiOkResponse({ description: 'Updated' })
  @ApiNotFoundResponse({ description: 'Not found' })
  update(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.rulesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a rule' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Not found' })
  remove(@Param('id') id: string) {
    return this.rulesService.remove(id);
  }
}
