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
import { ScheduleSlotsService } from './schedule-slots.service';
import { CreateScheduleSlotDto } from './dto/create-schedule-slot.dto';
import { UpdateScheduleSlotDto } from './dto/update-schedule-slot.dto';

@ApiTags('schedule-slots')
@Controller('schedule-slots')
export class ScheduleSlotsController {
  constructor(private readonly scheduleSlotsService: ScheduleSlotsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a schedule slot' })
  @ApiCreatedResponse({ description: 'Schedule slot created' })
  create(@Body() dto: CreateScheduleSlotDto) {
    return this.scheduleSlotsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all schedule slots' })
  @ApiOkResponse({ description: 'List of schedule slots' })
  findAll() {
    return this.scheduleSlotsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a schedule slot by id' })
  @ApiOkResponse({ description: 'Schedule slot found' })
  @ApiNotFoundResponse({ description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.scheduleSlotsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a schedule slot' })
  @ApiOkResponse({ description: 'Updated' })
  @ApiNotFoundResponse({ description: 'Not found' })
  update(@Param('id') id: string, @Body() dto: UpdateScheduleSlotDto) {
    return this.scheduleSlotsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a schedule slot' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Not found' })
  remove(@Param('id') id: string) {
    return this.scheduleSlotsService.remove(id);
  }
}
