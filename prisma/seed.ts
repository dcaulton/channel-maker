import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { SchedulerService } from '../src/scheduler/scheduler.service';
import { PrismaService } from '../src/prisma/prisma.service';

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

  await addTvStreamRules(prisma);

  console.log('Seed complete:', {
    channelId: channel.id,
    mediaAssetId: asset.id,
    workId: work.id,
    playlist: `http://localhost:3000/channels/${channel.id}/playlist.m3u`,
  });

  await prisma.$disconnect();
  await pool.end();
}

async function addTvStreamRules(prisma: PrismaClient) {
  const broadcast = await prisma.channel.upsert({
    where: { slug: 'broadcast-rotation' },
    update: {
      description: 'Deterministic 2h TVH rotation: WLS → ME-TV → WTTW',
    },
    create: {
      name: 'Broadcast Rotation',
      slug: 'broadcast-rotation',
      description: 'Deterministic 2h TVH rotation: WLS → ME-TV → WTTW',
    },
  });

  const streamSeed = [
    {
      title: 'WLS',
      year: undefined as number | undefined,
      description: 'ABC 7 Chicago via TVHeadend on strangehub',
      sourceUrl: 'http://strangehub:9981/stream/channel/wls',
    },
    {
      title: 'ME-TV',
      year: undefined,
      description: 'MeTV Chicago via TVHeadend on strangehub',
      sourceUrl: 'http://strangehub:9981/stream/channel/metv',
    },
    {
      title: 'WTTW',
      year: undefined,
      description: 'PBS 11 Chicago via TVHeadend on strangehub',
      sourceUrl: 'http://strangehub:9981/stream/channel/wttw',
    },
  ];

  for (const row of streamSeed) {
    let work = await prisma.work.findFirst({
      where: { title: row.title, kind: 'live' },
    });
    if (!work) {
      work = await prisma.work.create({
        data: {
          title: row.title,
          kind: 'live',
          synopsis: row.description,
        },
      });
    }
    await prisma.mediaAsset.upsert({
      where: { sourceUrl: row.sourceUrl },
      update: {
        workId: work.id,
        title: row.title,
        sourceType: 'http-live',
        description: row.description,
      },
      create: {
        title: row.title,
        sourceUrl: row.sourceUrl,
        sourceType: 'http-live',
        description: row.description,
        workId: work.id,
      },
    });
  }

  const ruleset = await prisma.ruleset.upsert({
    where: { slug: 'wls-metv-wttw' },
    update: {},
    create: {
      name: 'WLS / ME-TV / WTTW 2h rotation',
      slug: 'wls-metv-wttw',
      description: 'Local deterministic live-stream rotation',
      applyMode: 'sequential',
    },
  });

  const rotatePayload = {
    streamTitles: ['WLS', 'ME-TV', 'WTTW'],
    slotDurationSec: 7200,
  };

  const existingRule = await prisma.rule.findFirst({
    where: { rulesetId: ruleset.id, kind: 'rotate-tv-streams' },
  });
  if (existingRule) {
    await prisma.rule.update({
      where: { id: existingRule.id },
      data: { payload: rotatePayload, enabled: true, sortOrder: 0 },
    });
  } else {
    await prisma.rule.create({
      data: {
        rulesetId: ruleset.id,
        name: 'Rotate three TVH streams in 2h blocks',
        kind: 'rotate-tv-streams',
        scope: 'local',
        honorGlobals: true,
        sortOrder: 0,
        payload: rotatePayload,
      },
    });
  }

  await prisma.channelRuleset.upsert({
    where: {
      channelId_rulesetId: {
        channelId: broadcast.id,
        rulesetId: ruleset.id,
      },
    },
    update: { isActive: true, priority: 0 },
    create: {
      channelId: broadcast.id,
      rulesetId: ruleset.id,
      isActive: true,
      priority: 0,
    },
  });

  const scheduler = new SchedulerService(prisma as unknown as PrismaService);
  await scheduler.fillChannel({
    channelSlug: 'broadcast-rotation',
    from: new Date(),
    to: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
