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

  let work = await prisma.work.findFirst({
    where: { title: 'The Maltese Falcon', year: 1941 },
  });
  if (!work) {
    work = await prisma.work.create({
      data: {
        title: 'The Maltese Falcon',
        kind: 'movie',
        year: 1941,
        genre: 'film-noir',
        synopsis:
          'A San Francisco private eye takes on a case that is not what it seems.',
      },
    });
  }

  const sourceUrl = 'https://nas.local/films/noir1.mkv';
  const asset = await prisma.mediaAsset.upsert({
    where: { sourceUrl },
    update: { workId: work.id },
    create: {
      title: 'Night Owl Feature',
      sourceUrl,
      sourceType: 'file',
      durationSec: 7200,
      workId: work.id,
    },
  });

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
    workId: work.id,
    playlist: `http://localhost:3000/channels/${channel.id}/playlist.m3u`,
  });

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
