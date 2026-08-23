import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ScheduleSlotsService } from './schedule-slots.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ScheduleSlotsService', () => {
  let service: ScheduleSlotsService;
  let prisma: {
    channel: { findUnique: jest.Mock };
    scheduleSlot: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      channel: { findUnique: jest.fn() },
      scheduleSlot: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new ScheduleSlotsService(prisma as unknown as PrismaService);
  });

  it('rejects endsAt <= startsAt', async () => {
    prisma.channel.findUnique.mockResolvedValue({ id: 'ch1' });

    await expect(
      service.create({
        channelId: 'ch1',
        title: 'Bad range',
        startsAt: '2026-08-24T01:00:00.000Z',
        endsAt: '2026-08-23T23:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown channel', async () => {
    prisma.channel.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        channelId: 'missing',
        title: 'X',
        startsAt: '2026-08-23T23:00:00.000Z',
        endsAt: '2026-08-24T01:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a valid slot', async () => {
    prisma.channel.findUnique.mockResolvedValue({ id: 'ch1' });
    const created = { id: 'slot1', channelId: 'ch1', title: 'Night Owl' };
    prisma.scheduleSlot.create.mockResolvedValue(created);

    await expect(
      service.create({
        channelId: 'ch1',
        title: 'Night Owl',
        startsAt: '2026-08-23T23:00:00.000Z',
        endsAt: '2026-08-24T01:00:00.000Z',
      }),
    ).resolves.toEqual(created);
  });
});
