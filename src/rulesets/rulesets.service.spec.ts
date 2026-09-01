import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RulesetsService } from './rulesets.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RulesetsService', () => {
  let service: RulesetsService;
  let prisma: {
    ruleset: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      ruleset: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new RulesetsService(prisma as unknown as PrismaService);
  });

  it('creates a ruleset with sequential default', async () => {
    const dto = { name: 'Broadcast rotation', slug: 'wls-metv-wttw' };
    const created = { id: 'rs1', applyMode: 'sequential', ...dto };
    prisma.ruleset.create.mockResolvedValue(created);

    await expect(service.create(dto)).resolves.toEqual(created);
    expect(prisma.ruleset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: 'wls-metv-wttw',
        applyMode: 'sequential',
      }),
    });
  });

  it('maps duplicate slug to ConflictException', async () => {
    prisma.ruleset.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.9.1',
        meta: { target: ['slug'] },
      }),
    );

    await expect(
      service.create({ name: 'X', slug: 'wls-metv-wttw' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws NotFoundException when missing', async () => {
    prisma.ruleset.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
