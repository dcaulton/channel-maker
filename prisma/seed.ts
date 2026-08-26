import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const channel = await prisma.channel.upsert({
    where: { slug: 'classic-movies' },
    update: {},
    create: {
      name: 'Classic Movies',
      slug: 'classic-movies',
      description: 'Seed channel for local demos',
    },
  });

  let asset = await prisma.mediaAsset.findFirst({
    where: {
      title: 'Night Owl Feature',
      sourceUrl: 'https://nas.local/films/noir1.mkv',
    },
  });
  if (!asset) {
    asset = await prisma.mediaAsset.create({
      data: {
        title: 'Night Owl Feature',
        sourceUrl: 'https://nas.local/films/noir1.mkv',
        sourceType: 'file',
        durationSec: 7200,
      },
    });
  }

  // Idempotent-ish: delete prior seed slots on this channel, recreate one window
  await prisma.scheduleSlot.deleteMany({
    where: { channelId: channel.id, title: 'Seed Night Owl' },
  });

  const startsAt = new Date();
  startsAt.setMinutes(0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

  await prisma.scheduleSlot.create({
    data: {
      channelId: channel.id,
      mediaAssetId: asset.id,
      title: 'Seed Night Owl',
      description: 'Seeded slot covering a 2h window from the current hour',
      startsAt,
      endsAt,
    },
  });

  console.log('Seed complete:', {
    channelId: channel.id,
    mediaAssetId: asset.id,
    playlist: `http://localhost:3000/channels/${channel.id}/playlist.m3u`,
  });

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
