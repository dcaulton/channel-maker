import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MediaAssetsService } from './media-assets.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MediaAssetsService', () => {
  let service: MediaAssetsService;
  let prisma: {
    mediaAsset: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      mediaAsset: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };
    service = new MediaAssetsService(prisma as unknown as PrismaService);
  });

  it('creates a media asset', async () => {
    const dto = {
      title: 'Noir Feature',
      sourceUrl: 'https://nas.local/films/noir1.mkv',
      sourceType: 'file',
    };
    const created = { id: 'asset1', ...dto, needsVpn: false };
    prisma.mediaAsset.create.mockResolvedValue(created);

    await expect(service.create(dto)).resolves.toEqual(created);
    expect(prisma.mediaAsset.create).toHaveBeenCalled();
  });

  it('rejects needsVpn without vpnCountry', async () => {
    await expect(
      service.create({
        title: 'Live',
        sourceUrl: 'https://example.com/live.m3u8',
        needsVpn: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when missing', async () => {
    prisma.mediaAsset.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('pages a title search', async () => {
    prisma.mediaAsset.findMany.mockResolvedValue([
      { id: 'a', title: 'Justice 1' },
    ]);
    prisma.mediaAsset.count.mockResolvedValue(41);

    await expect(service.search('justice', 2, 20)).resolves.toEqual({
      items: [{ id: 'a', title: 'Justice 1' }],
      page: 2,
      pageSize: 20,
      total: 41,
    });
    expect(prisma.mediaAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
  });
});
