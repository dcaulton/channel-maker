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
import { WorksService } from './works.service';
import { CreateWorkDto } from './dto/create-work.dto';
import { UpdateWorkDto } from './dto/update-work.dto';

@ApiTags('works')
@Controller('works')
export class WorksController {
  constructor(private readonly worksService: WorksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a catalog work' })
  @ApiCreatedResponse({ description: 'Work created' })
  create(@Body() dto: CreateWorkDto) {
    return this.worksService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List catalog works' })
  @ApiOkResponse({ description: 'List of works' })
  findAll() {
    return this.worksService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a work by id (includes linked assets)' })
  @ApiOkResponse({ description: 'Work found' })
  @ApiNotFoundResponse({ description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.worksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a work' })
  @ApiOkResponse({ description: 'Updated' })
  @ApiNotFoundResponse({ description: 'Not found' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkDto) {
    return this.worksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a work (assets are unlinked, not deleted)',
  })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Not found' })
  remove(@Param('id') id: string) {
    return this.worksService.remove(id);
  }
}
