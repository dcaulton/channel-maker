import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkDto } from './dto/create-work.dto';
import { UpdateWorkDto } from './dto/update-work.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class WorksService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateWorkDto) {
    return this.prisma.work.create({
      data: {
        title: dto.title,
        kind: dto.kind ?? 'movie',
        year: dto.year,
        genre: dto.genre,
        synopsis: dto.synopsis,
        seriesTitle: dto.seriesTitle,
        season: dto.season,
        episode: dto.episode,
        externalIds:
          dto.externalIds === undefined
            ? undefined
            : (dto.externalIds as Prisma.InputJsonValue),
      },
    });
  }

  findAll() {
    return this.prisma.work.findMany({
      orderBy: [{ title: 'asc' }, { year: 'asc' }],
      include: {
        _count: { select: { assets: true } },
      },
    });
  }

  async findOne(id: string) {
    const work = await this.prisma.work.findUnique({
      where: { id },
      include: {
        assets: { orderBy: { title: 'asc' } },
        _count: { select: { assets: true } },
      },
    });
    if (!work) {
      throw new NotFoundException(`Work ${id} not found`);
    }
    return work;
  }

  async update(id: string, dto: UpdateWorkDto) {
    await this.findOne(id);
    return this.prisma.work.update({
      where: { id },
      data: {
        title: dto.title,
        kind: dto.kind,
        year: dto.year,
        genre: dto.genre,
        synopsis: dto.synopsis,
        seriesTitle: dto.seriesTitle,
        season: dto.season,
        episode: dto.episode,
        externalIds:
          dto.externalIds === undefined
            ? undefined
            : (dto.externalIds as Prisma.InputJsonValue),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.work.delete({ where: { id } });
  }
}
