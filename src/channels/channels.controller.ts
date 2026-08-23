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
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@ApiTags('channels')
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a channel' })
  @ApiCreatedResponse({ description: 'Channel created' })
  create(@Body() dto: CreateChannelDto) {
    return this.channelsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all channels' })
  @ApiOkResponse({ description: 'List of channels' })
  findAll() {
    return this.channelsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a channel by id (includes schedule slots)' })
  @ApiOkResponse({ description: 'Channel found' })
  @ApiNotFoundResponse({ description: 'Channel not found' })
  findOne(@Param('id') id: string) {
    return this.channelsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a channel' })
  @ApiOkResponse({ description: 'Channel updated' })
  @ApiNotFoundResponse({ description: 'Channel not found' })
  update(@Param('id') id: string, @Body() dto: UpdateChannelDto) {
    return this.channelsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a channel' })
  @ApiNoContentResponse({ description: 'Channel deleted' })
  @ApiNotFoundResponse({ description: 'Channel not found' })
  remove(@Param('id') id: string) {
    return this.channelsService.remove(id);
  }
}
