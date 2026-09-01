import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelRulesetDto } from './dto/create-channel-ruleset.dto';
import { UpdateChannelRulesetDto } from './dto/update-channel-ruleset.dto';

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

const bindingInclude = {
  channel: { select: { id: true, name: true, slug: true } },
  ruleset: { select: { id: true, name: true, slug: true } },
} as const;

@Injectable()
export class ChannelRulesetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateChannelRulesetDto) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: dto.channelId },
    });
    if (!channel) {
      throw new NotFoundException(`Channel ${dto.channelId} not found`);
    }
    const ruleset = await this.prisma.ruleset.findUnique({
      where: { id: dto.rulesetId },
    });
    if (!ruleset) {
      throw new NotFoundException(`Ruleset ${dto.rulesetId} not found`);
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    try {
      return await this.prisma.channelRuleset.create({
        data: {
          channelId: dto.channelId,
          rulesetId: dto.rulesetId,
          priority: dto.priority ?? 0,
          isActive: dto.isActive ?? true,
          startsAt,
          endsAt,
        },
        include: bindingInclude,
      });
    } catch (error: unknown) {
      if (isUniqueConflict(error)) {
        throw new ConflictException(
          'That ruleset is already bound to this channel',
        );
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.channelRuleset.findMany({
      orderBy: [{ channelId: 'asc' }, { priority: 'asc' }],
      include: bindingInclude,
    });
  }

  async findOne(id: string) {
    const binding = await this.prisma.channelRuleset.findUnique({
      where: { id },
      include: bindingInclude,
    });
    if (!binding) {
      throw new NotFoundException(`Channel ruleset binding ${id} not found`);
    }
    return binding;
  }

  async update(id: string, dto: UpdateChannelRulesetDto) {
    const existing = await this.findOne(id);
    const startsAt =
      dto.startsAt !== undefined ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt =
      dto.endsAt !== undefined ? new Date(dto.endsAt) : existing.endsAt;
    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    return this.prisma.channelRuleset.update({
      where: { id },
      data: {
        priority: dto.priority,
        isActive: dto.isActive,
        startsAt: dto.startsAt !== undefined ? startsAt : undefined,
        endsAt: dto.endsAt !== undefined ? endsAt : undefined,
      },
      include: bindingInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.channelRuleset.delete({ where: { id } });
  }
}
