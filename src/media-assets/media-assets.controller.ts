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
import { MediaAssetsService } from './media-assets.service';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto';

@ApiTags('media-assets')
@Controller('media-assets')
export class MediaAssetsController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a media asset' })
  @ApiCreatedResponse({ description: 'Media asset created' })
  create(@Body() dto: CreateMediaAssetDto) {
    return this.mediaAssetsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all media assets' })
  @ApiOkResponse({ description: 'List of media assets' })
  findAll() {
    return this.mediaAssetsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a media asset by id' })
  @ApiOkResponse({ description: 'Media asset found' })
  @ApiNotFoundResponse({ description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.mediaAssetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a media asset' })
  @ApiOkResponse({ description: 'Updated' })
  @ApiNotFoundResponse({ description: 'Not found' })
  update(@Param('id') id: string, @Body() dto: UpdateMediaAssetDto) {
    return this.mediaAssetsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a media asset' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Not found' })
  remove(@Param('id') id: string) {
    return this.mediaAssetsService.remove(id);
  }
}
