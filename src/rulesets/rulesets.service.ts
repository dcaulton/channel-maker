import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRulesetDto } from './dto/create-ruleset.dto';
import { UpdateRulesetDto } from './dto/update-ruleset.dto';

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class RulesetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRulesetDto) {
    try {
      return await this.prisma.ruleset.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          applyMode: dto.applyMode ?? 'sequential',
        },
      });
    } catch (error: unknown) {
      if (isUniqueConflict(error)) {
        throw new ConflictException(
          `Ruleset with slug "${dto.slug}" already exists`,
        );
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.ruleset.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { rules: true, channels: true } },
      },
    });
  }

  async findOne(id: string) {
    const ruleset = await this.prisma.ruleset.findUnique({
      where: { id },
      include: {
        rules: { orderBy: { sortOrder: 'asc' } },
        channels: {
          include: {
            channel: { select: { id: true, name: true, slug: true } },
          },
        },
        _count: { select: { rules: true, channels: true } },
      },
    });
    if (!ruleset) {
      throw new NotFoundException(`Ruleset ${id} not found`);
    }
    return ruleset;
  }

  async update(id: string, dto: UpdateRulesetDto) {
    await this.findOne(id);
    try {
      return await this.prisma.ruleset.update({
        where: { id },
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          applyMode: dto.applyMode,
        },
      });
    } catch (error: unknown) {
      if (isUniqueConflict(error)) {
        throw new ConflictException('Slug already in use');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.ruleset.delete({ where: { id } });
  }
}
