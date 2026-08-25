import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto';

@Injectable()
export class MediaAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertVpnFields(needsVpn?: boolean, vpnCountry?: string | null) {
    if (needsVpn && !vpnCountry) {
      throw new BadRequestException(
        'vpnCountry is required when needsVpn is true',
      );
    }
  }

  async create(dto: CreateMediaAssetDto) {
    this.assertVpnFields(dto.needsVpn, dto.vpnCountry);

    return this.prisma.mediaAsset.create({
      data: {
        title: dto.title,
        sourceUrl: dto.sourceUrl,
        sourceType: dto.sourceType ?? 'file',
        durationSec: dto.durationSec,
        description: dto.description,
        needsVpn: dto.needsVpn ?? false,
        vpnCountry: dto.vpnCountry,
      },
    });
  }

  findAll() {
    return this.prisma.mediaAsset.findMany({
      orderBy: { title: 'asc' },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
    });
    if (!asset) {
      throw new NotFoundException(`Media asset ${id} not found`);
    }
    return asset;
  }

  async update(id: string, dto: UpdateMediaAssetDto) {
    const existing = await this.findOne(id);

    const needsVpn = dto.needsVpn ?? existing.needsVpn;
    const vpnCountry =
      dto.vpnCountry !== undefined ? dto.vpnCountry : existing.vpnCountry;

    this.assertVpnFields(needsVpn, vpnCountry);

    return this.prisma.mediaAsset.update({
      where: { id },
      data: {
        title: dto.title,
        sourceUrl: dto.sourceUrl,
        sourceType: dto.sourceType,
        durationSec: dto.durationSec,
        description: dto.description,
        needsVpn: dto.needsVpn,
        vpnCountry: dto.vpnCountry,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.mediaAsset.delete({ where: { id } });
  }
}
