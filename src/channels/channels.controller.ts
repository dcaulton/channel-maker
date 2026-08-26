import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@ApiTags('channels')
@Controller('channels')
export class ChannelsController {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly config: ConfigService,
  ) {}

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

  @Get(':id/now')
  @ApiOperation({ summary: 'Get the slot currently playing on this channel' })
  @ApiOkResponse({
    description: 'Current slot, or null if nothing is scheduled',
  })
  @ApiNotFoundResponse({ description: 'Channel not found' })
  findNow(@Param('id') id: string) {
    return this.channelsService.findNow(id);
  }

  @Get(':id/schedule')
  @ApiOperation({ summary: 'List slots overlapping a time window' })
  @ApiOkResponse({ description: 'Slots in range' })
  @ApiNotFoundResponse({ description: 'Channel not found' })
  findSchedule(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to
      ? new Date(to)
      : new Date(fromDate.getTime() + 6 * 60 * 60 * 1000); // default: 6 hours

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException(
        'from and to must be valid ISO date strings',
      );
    }

    return this.channelsService.findSchedule(id, fromDate, toDate);
  }

  @Get(':id/playlist.m3u')
  @ApiOperation({
    summary: 'M3U playlist for a schedule window (default next 6 hours)',
  })
  @Header('Content-Type', 'application/vnd.apple.mpegurl')
  async playlist(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to
      ? new Date(to)
      : new Date(fromDate.getTime() + 6 * 60 * 60 * 1000);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException(
        'from and to must be valid ISO date strings',
      );
    }

    const vpnProxyBaseUrl = this.config.get<string>('VPN_PROXY_BASE_URL');
    const { body, channelName } = await this.channelsService.getPlaylistM3u(
      id,
      fromDate,
      toDate,
      vpnProxyBaseUrl,
    );

    res!.setHeader(
      'Content-Disposition',
      `inline; filename="${channelName.replace(/[^a-z0-9-_]+/gi, '_')}.m3u"`,
    );
    res!.send(body);
  }
}
