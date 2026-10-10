import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto';
import { BatchLinkDto } from './dto/batch-link.dto';

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

const assetInclude = {
  work: true,
} as const;

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

  private async assertWorkExists(workId?: string) {
    if (!workId) {
      return;
    }
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) {
      throw new NotFoundException(`Work ${workId} not found`);
    }
  }

  async create(dto: CreateMediaAssetDto) {
    this.assertVpnFields(dto.needsVpn, dto.vpnCountry);
    await this.assertWorkExists(dto.workId);

    try {
      return await this.prisma.mediaAsset.create({
        data: {
          title: dto.title,
          sourceUrl: dto.sourceUrl,
          sourceType: dto.sourceType ?? 'file',
          durationSec: dto.durationSec,
          description: dto.description,
          needsVpn: dto.needsVpn ?? false,
          vpnCountry: dto.vpnCountry,
          workId: dto.workId,
        },
        include: assetInclude,
      });
    } catch (error: unknown) {
      if (isUniqueConflict(error)) {
        throw new ConflictException(
          `Media asset with sourceUrl "${dto.sourceUrl}" already exists`,
        );
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.mediaAsset.findMany({
      orderBy: { title: 'asc' },
      include: assetInclude,
    });
  }

  async search(q = '', page = 1, pageSize = 20) {
    const take = Math.min(
      Math.max(Number.isFinite(pageSize) ? pageSize : 20, 1),
      50,
    );
    const current = Math.max(Number.isFinite(page) ? page : 1, 1);
    const where = q.trim()
      ? { title: { contains: q.trim(), mode: 'insensitive' as const } }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { title: 'asc' },
        skip: (current - 1) * take,
        take,
        include: assetInclude,
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);
    return { items, page: current, pageSize: take, total };
  }

  async findOne(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
      include: assetInclude,
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
    if (dto.workId !== undefined) {
      await this.assertWorkExists(dto.workId);
    }

    try {
      return await this.prisma.mediaAsset.update({
        where: { id },
        data: {
          title: dto.title,
          sourceUrl: dto.sourceUrl,
          sourceType: dto.sourceType,
          durationSec: dto.durationSec,
          description: dto.description,
          needsVpn: dto.needsVpn,
          vpnCountry: dto.vpnCountry,
          workId: dto.workId,
        },
        include: assetInclude,
      });
    } catch (error: unknown) {
      if (isUniqueConflict(error)) {
        throw new ConflictException('sourceUrl already in use');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.mediaAsset.delete({ where: { id } });
  }

  async batchLink(dto: BatchLinkDto) {
    const upserted: string[] = [];
    for (const item of dto.items) {
      const work = await this.prisma.work.findUnique({
        where: { id: item.workId },
      });
      if (!work) {
        continue;
      }
      const asset = await this.prisma.mediaAsset.upsert({
        where: { sourceUrl: item.sourceUrl },
        update: {
          workId: work.id,
          durationSec: item.durationSec,
          description: item.description,
          sourceType: item.sourceType ?? 'file',
          title: work.title,
        },
        create: {
          title: work.title,
          sourceUrl: item.sourceUrl,
          sourceType: item.sourceType ?? 'file',
          durationSec: item.durationSec,
          description: item.description,
          workId: work.id,
        },
      });
      upserted.push(asset.id);
    }
    return { upserted: upserted.length, ids: upserted };
  }
}
