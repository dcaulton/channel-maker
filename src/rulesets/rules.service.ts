import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@Injectable()
export class RulesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertRulesetExists(rulesetId: string) {
    const ruleset = await this.prisma.ruleset.findUnique({
      where: { id: rulesetId },
    });
    if (!ruleset) {
      throw new NotFoundException(`Ruleset ${rulesetId} not found`);
    }
  }

  async create(dto: CreateRuleDto) {
    await this.assertRulesetExists(dto.rulesetId);
    return this.prisma.rule.create({
      data: {
        rulesetId: dto.rulesetId,
        name: dto.name,
        kind: dto.kind,
        scope: dto.scope ?? 'local',
        honorGlobals: dto.honorGlobals ?? true,
        enabled: dto.enabled ?? true,
        sortOrder: dto.sortOrder ?? 0,
        payload: dto.payload as Prisma.InputJsonValue,
      },
    });
  }

  findAll() {
    return this.prisma.rule.findMany({
      orderBy: [{ rulesetId: 'asc' }, { sortOrder: 'asc' }],
      include: {
        ruleset: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findOne(id: string) {
    const rule = await this.prisma.rule.findUnique({
      where: { id },
      include: {
        ruleset: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!rule) {
      throw new NotFoundException(`Rule ${id} not found`);
    }
    return rule;
  }

  async update(id: string, dto: UpdateRuleDto) {
    await this.findOne(id);
    if (dto.rulesetId) {
      await this.assertRulesetExists(dto.rulesetId);
    }
    return this.prisma.rule.update({
      where: { id },
      data: {
        rulesetId: dto.rulesetId,
        name: dto.name,
        kind: dto.kind,
        scope: dto.scope,
        honorGlobals: dto.honorGlobals,
        enabled: dto.enabled,
        sortOrder: dto.sortOrder,
        payload:
          dto.payload === undefined
            ? undefined
            : (dto.payload as Prisma.InputJsonValue),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.rule.delete({ where: { id } });
  }
}
