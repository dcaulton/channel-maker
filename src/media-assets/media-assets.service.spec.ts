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
});
