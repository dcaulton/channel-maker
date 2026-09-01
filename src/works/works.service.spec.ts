import { NotFoundException } from '@nestjs/common';
import { WorksService } from './works.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WorksService', () => {
  let service: WorksService;
  let prisma: {
    work: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      work: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new WorksService(prisma as unknown as PrismaService);
  });

  it('creates a work with movie default kind', async () => {
    const dto = { title: 'The Maltese Falcon', year: 1941 };
    const created = { id: 'w1', kind: 'movie', ...dto };
    prisma.work.create.mockResolvedValue(created);

    await expect(service.create(dto)).resolves.toEqual(created);
    expect(prisma.work.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'The Maltese Falcon',
        kind: 'movie',
        year: 1941,
      }),
    });
  });

  it('throws NotFoundException when missing', async () => {
    prisma.work.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
