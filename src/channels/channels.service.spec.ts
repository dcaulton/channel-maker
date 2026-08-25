import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

describe('ChannelsService', () => {
  let service: ChannelsService;
  let prisma: {
    channel: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      channel: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      scheduleSlot: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    service = new ChannelsService(prisma as unknown as PrismaService);
  });

  it('creates a channel', async () => {
    const dto = { name: 'Classic Movies', slug: 'classic-movies' };
    const created = { id: '1', ...dto, isActive: true };
    prisma.channel.create.mockResolvedValue(created);

    await expect(service.create(dto)).resolves.toEqual(created);
    expect(prisma.channel.create).toHaveBeenCalledWith({ data: dto });
  });

  it('maps unique constraint to ConflictException', async () => {
    prisma.channel.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.9.1',
        meta: { target: ['slug'] },
      }),
    );

    await expect(
      service.create({ name: 'X', slug: 'classic-movies' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists channels with slot counts', async () => {
    prisma.channel.findMany.mockResolvedValue([]);
    await service.findAll();
    expect(prisma.channel.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      include: { _count: { select: { slots: true } } },
    });
  });

  it('throws NotFoundException when channel missing', async () => {
    prisma.channel.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findSchedule rejects invalid range', async () => {
    prisma.channel.findUnique.mockResolvedValue({
      id: 'ch1',
      slots: [],
      _count: { slots: 0 },
    });

    await expect(
      service.findSchedule(
        'ch1',
        new Date('2026-08-26T00:00:00Z'),
        new Date('2026-08-25T00:00:00Z'),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('findNow queries overlapping slot', () => {
    prisma.channel.findUnique.mockResolvedValue({
      id: 'ch1',
      slots: [],
      _count: { slots: 0 },
    });
    prisma.scheduleSlot = {
      findFirst: jest.fn().mockResolvedValue({ id: 'slot1' }),
      findMany: jest.fn(),
    };

    // If your mock only has channel.*, extend the prisma mock with scheduleSlot
  });

  describe('schedule queries', () => {
    const channelId = 'ch1';
    const channelRow = {
      id: channelId,
      name: 'Test',
      slug: 'test',
      slots: [],
      _count: { slots: 0 },
    };

    beforeEach(() => {
      prisma.channel.findUnique.mockResolvedValue(channelRow);
    });

    it('findSchedule rejects to <= from', async () => {
      await expect(
        service.findSchedule(
          channelId,
          new Date('2026-08-26T12:00:00.000Z'),
          new Date('2026-08-26T11:00:00.000Z'),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('findSchedule queries overlapping slots', async () => {
      const from = new Date('2026-08-26T00:00:00.000Z');
      const to = new Date('2026-08-26T06:00:00.000Z');
      const slots = [{ id: 'slot1', title: 'Morning' }];
      prisma.scheduleSlot.findMany.mockResolvedValue(slots);

      await expect(service.findSchedule(channelId, from, to)).resolves.toEqual(
        slots,
      );

      expect(prisma.scheduleSlot.findMany).toHaveBeenCalledWith({
        where: {
          channelId,
          startsAt: { lt: to },
          endsAt: { gt: from },
        },
        orderBy: { startsAt: 'asc' },
        include: { mediaAsset: true },
      });
    });

    it('findSchedule throws when channel missing', async () => {
      prisma.channel.findUnique.mockResolvedValue(null);

      await expect(
        service.findSchedule(
          'missing',
          new Date('2026-08-26T00:00:00.000Z'),
          new Date('2026-08-26T06:00:00.000Z'),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('findNow returns current overlapping slot', async () => {
      const at = new Date('2026-08-26T12:00:00.000Z');
      const slot = { id: 'slot-now', title: 'Live' };
      prisma.scheduleSlot.findFirst.mockResolvedValue(slot);

      await expect(service.findNow(channelId, at)).resolves.toEqual(slot);

      expect(prisma.scheduleSlot.findFirst).toHaveBeenCalledWith({
        where: {
          channelId,
          startsAt: { lte: at },
          endsAt: { gt: at },
        },
        include: { mediaAsset: true },
      });
    });

    it('findNow returns null when nothing is airing', async () => {
      prisma.scheduleSlot.findFirst.mockResolvedValue(null);

      await expect(service.findNow(channelId)).resolves.toBeNull();
    });
  });
});
