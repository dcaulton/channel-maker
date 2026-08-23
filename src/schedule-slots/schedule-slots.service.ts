import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleSlotDto } from './dto/create-schedule-slot.dto';
import { UpdateScheduleSlotDto } from './dto/update-schedule-slot.dto';

@Injectable()
export class ScheduleSlotsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertValidRange(startsAt: Date, endsAt: Date) {
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
  }

  async create(dto: CreateScheduleSlotDto) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: dto.channelId },
    });
    if (!channel) {
      throw new NotFoundException(`Channel ${dto.channelId} not found`);
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.assertValidRange(startsAt, endsAt);

    return this.prisma.scheduleSlot.create({
      data: {
        channelId: dto.channelId,
        title: dto.title,
        description: dto.description,
        startsAt,
        endsAt,
      },
    });
  }

  findAll() {
    return this.prisma.scheduleSlot.findMany({
      orderBy: { startsAt: 'asc' },
      include: {
        channel: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findOne(id: string) {
    const slot = await this.prisma.scheduleSlot.findUnique({
      where: { id },
      include: {
        channel: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!slot) {
      throw new NotFoundException(`Schedule slot ${id} not found`);
    }
    return slot;
  }

  async update(id: string, dto: UpdateScheduleSlotDto) {
    await this.findOne(id);

    const data: {
      title?: string;
      description?: string | null;
      startsAt?: Date;
      endsAt?: Date;
    } = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.startsAt !== undefined) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) data.endsAt = new Date(dto.endsAt);

    if (data.startsAt || data.endsAt) {
      const current = await this.prisma.scheduleSlot.findUniqueOrThrow({
        where: { id },
      });
      const startsAt = data.startsAt ?? current.startsAt;
      const endsAt = data.endsAt ?? current.endsAt;
      this.assertValidRange(startsAt, endsAt);
    }

    return this.prisma.scheduleSlot.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.scheduleSlot.delete({ where: { id } });
  }
}
