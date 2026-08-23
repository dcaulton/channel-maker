import { ConflictException, NotFoundException } from '@nestjs/common';
import { ChannelsService } from './channels.service';
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
    prisma.channel.create.mockRejectedValue({ code: 'P2002' });

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
});
