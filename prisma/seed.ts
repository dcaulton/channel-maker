import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { SchedulerService } from '../src/scheduler/scheduler.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { zonedLocalToUtc } from 'src/scheduler/zoned-time';

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
  await addDaypartLab(prisma);
  await addSpookyRules(prisma);
  await addNoProgrammingSlate(prisma);

  console.log('Seed complete:', {
    channelId: channel.id,
    mediaAssetId: asset.id,
    workId: work.id,
    playlist: `http://localhost:3000/channels/${channel.id}/playlist.m3u`,
  });

  await prisma.$disconnect();
  await pool.end();
}

async function addNoProgrammingSlate(prisma: PrismaClient) {
  let noProgramming = await prisma.work.findFirst({
    where: { kind: 'slate', title: 'No programming' },
  });
  if (!noProgramming) {
    noProgramming = await prisma.work.create({
      data: { kind: 'slate', title: 'No programming' },
    });
  }

  const slateUrl =
    process.env.SLATE_SOURCE_URL ??
    'http://10.0.0.89:8088/slates/no-programming.mp4';

  await prisma.mediaAsset.upsert({
    where: { sourceUrl: slateUrl },
    update: {
      workId: noProgramming.id,
      durationSec: 5,
      sourceType: 'file',
    },
    create: {
      title: 'No programming',
      sourceUrl: slateUrl,
      sourceType: 'file',
      durationSec: 5,
      workId: noProgramming.id,
    },
  });
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
      title: 'WLS-HD',
      year: undefined as number | undefined,
      description: 'ABC 7 Chicago via TVHeadend on strangehub',
      sourceUrl: 'http://strangehub:9981/stream/channel/wls',
    },
    {
      title: 'METV',
      year: undefined,
      description: 'MeTV Chicago via TVHeadend on strangehub',
      sourceUrl: 'http://strangehub:9981/stream/channel/metv',
    },
    {
      title: 'WTTW HD',
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
      name: 'WLS-HD / METV / WTTW HD 2h rotation',
      slug: 'wls-metv-wttw',
      description: 'Local deterministic live-stream rotation',
      applyMode: 'sequential',
    },
  });

  const rotatePayload = {
    streamTitles: ['WLS-HD', 'METV', 'WTTW HD'],
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

async function addDaypartLab(prisma: PrismaClient) {
  const channel = await prisma.channel.upsert({
    where: { slug: 'daypart-lab' },
    update: {},
    create: {
      name: 'Daypart Lab',
      slug: 'daypart-lab',
      description: 'WLS overnight, SHOWA/B/C dayparts, evening slate',
    },
  });

  const seasons = [8, 10, 14];
  for (const series of ['SHOWA', 'SHOWB', 'SHOWC'] as const) {
    let seriesWork = await prisma.work.findFirst({
      where: { title: series, kind: 'series' },
    });
    if (!seriesWork) {
      seriesWork = await prisma.work.create({
        data: { title: series, kind: 'series' },
      });
    }
    for (let season = 1; season <= seasons.length; season += 1) {
      for (let episode = 1; episode <= seasons[season - 1]; episode += 1) {
        const code = `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
        const title = `${series}-${code}`;
        const sourceUrl = `https://nas.local/tv/${series.toLowerCase()}/${code}.mkv`;
        let work = await prisma.work.findFirst({
          where: { title, kind: 'episode' },
        });
        if (!work) {
          work = await prisma.work.create({
            data: {
              title,
              kind: 'episode',
              seriesTitle: series,
              season,
              episode,
            },
          });
        }
        await prisma.mediaAsset.upsert({
          where: { sourceUrl },
          update: { workId: work.id, durationSec: 1800 },
          create: {
            title,
            sourceUrl,
            sourceType: 'file',
            durationSec: 1800,
            workId: work.id,
          },
        });
      }
    }
  }

  let slateWork = await prisma.work.findFirst({
    where: { title: 'No programming', kind: 'slate' },
  });
  if (!slateWork) {
    slateWork = await prisma.work.create({
      data: { title: 'No programming', kind: 'slate' },
    });
  }
  await prisma.mediaAsset.upsert({
    where: { sourceUrl: 'https://nas.local/slate/no-programming.mp4' },
    update: { workId: slateWork.id },
    create: {
      title: 'No programming',
      sourceUrl: 'https://nas.local/slate/no-programming.mp4',
      sourceType: 'file',
      durationSec: 1,
      workId: slateWork.id,
    },
  });

  // WLS live work+asset already created by the TVH seed helper.

  const ruleset = await prisma.ruleset.upsert({
    where: { slug: 'wls-showabc-slate' },
    update: {},
    create: {
      name: 'WLS + SHOWA/B/C + slate',
      slug: 'wls-showabc-slate',
      applyMode: 'sequential',
    },
  });

  const windowPayload = {
    timeZone: 'America/Chicago',
    episodeOrigin: '2026-09-01',
    items: [
      {
        start: '00:00',
        end: '05:00',
        days: 'daily',
        mode: 'live',
        title: 'WLS-HD',
      },
      {
        start: '05:00',
        end: '09:00',
        days: 'daily',
        mode: 'episodes',
        title: 'SHOWA',
        seriesTitle: 'SHOWA',
      },
      {
        start: '09:00',
        end: '14:00',
        days: 'daily',
        mode: 'episodes',
        title: 'SHOWB',
        seriesTitle: 'SHOWB',
      },
      {
        start: '14:00',
        end: '19:00',
        days: 'daily',
        mode: 'episodes',
        title: 'SHOWC',
        seriesTitle: 'SHOWC',
      },
      {
        start: '19:00',
        end: '24:00',
        days: 'daily',
        mode: 'slate',
        title: 'No programming',
      },
    ],
  };

  const existing = await prisma.rule.findFirst({
    where: { rulesetId: ruleset.id, kind: 'windowed-sources' },
  });
  if (existing) {
    await prisma.rule.update({
      where: { id: existing.id },
      data: { payload: windowPayload, enabled: true },
    });
  } else {
    await prisma.rule.create({
      data: {
        rulesetId: ruleset.id,
        name: 'Weekday-shaped dayparts',
        kind: 'windowed-sources',
        scope: 'local',
        sortOrder: 0,
        payload: windowPayload,
      },
    });
  }

  await prisma.channelRuleset.upsert({
    where: {
      channelId_rulesetId: { channelId: channel.id, rulesetId: ruleset.id },
    },
    update: { isActive: true, priority: 0 },
    create: {
      channelId: channel.id,
      rulesetId: ruleset.id,
      isActive: true,
      priority: 0,
    },
  });

  const scheduler = new SchedulerService(prisma as unknown as PrismaService);
  return scheduler.fillChannel({
    channelSlug: 'daypart-lab',
    from: zonedLocalToUtc('America/Chicago', 2026, 9, 1, 0, 0),
    to: zonedLocalToUtc('America/Chicago', 2026, 9, 15, 0, 0),
  });
}

async function addSpookyRules(prisma: PrismaClient) {
  const spooky = await prisma.channel.upsert({
    where: { slug: 'spooky-stories' },
    update: {
      description: '2h anthology wheels from the Spooky-Stories folder',
    },
    create: {
      name: 'Spooky Stories',
      slug: 'spooky-stories',
      description: '2h anthology wheels from the Spooky-Stories folder',
    },
  });

  const spookyRules = await prisma.ruleset.upsert({
    where: { slug: 'spooky-dayparts' },
    update: {},
    create: {
      name: 'Spooky Stories dayparts',
      slug: 'spooky-dayparts',
      applyMode: 'sequential',
    },
  });

  const spookyPayload = {
    timeZone: 'America/Chicago',
    episodeOrigin: '2026-09-08',
    fallbackSlateTitle: 'No programming',
    items: [
      {
        start: '14:00',
        end: '16:00',
        days: 'daily',
        mode: 'episodes',
        title: 'Creepshow',
        seriesTitle: 'Creepshow',
        overflow: 'slate',
      },
      {
        start: '16:00',
        end: '18:00',
        days: 'daily',
        mode: 'episodes',
        title: 'Tales from the Crypt',
        seriesTitle: 'Tales from the Crypt',
        overflow: 'slate',
      },
      {
        start: '18:00',
        end: '20:00',
        days: 'daily',
        mode: 'episodes',
        title: 'Tales from the Darkside',
        seriesTitle: 'Tales from the Darkside',
        overflow: 'slate',
      },
      {
        start: '20:00',
        end: '22:00',
        days: 'daily',
        mode: 'episodes',
        title: 'Cabinet of Curiosities',
        seriesTitle: 'Cabinet of Curiosities',
        overflow: 'slate',
      },
      {
        start: '22:00',
        end: '23:00',
        days: 'daily',
        mode: 'episodes',
        title: 'Archive 81',
        seriesTitle: 'Archive 81',
        overflow: 'slate',
      },
      {
        start: '23:00',
        end: '24:00',
        days: 'daily',
        mode: 'episodes',
        title: 'Darkroom',
        seriesTitle: 'Darkroom',
        overflow: 'slate',
      },
      {
        start: '00:00',
        end: '01:00',
        days: 'daily',
        mode: 'episodes',
        title: 'Hammer House of Horror',
        seriesTitle: 'Hammer House of Horror',
        overflow: 'slate',
      },
      {
        start: '01:00',
        end: '02:00',
        days: 'daily',
        mode: 'episodes',
        title: 'Hammer House of Mystery and Suspense',
        seriesTitle: 'Hammer House of Mystery and Suspense',
        overflow: 'slate',
      },
      {
        start: '02:00',
        end: '04:00',
        days: 'daily',
        mode: 'episodes',
        title: 'Monsters',
        seriesTitle: 'Monsters',
        overflow: 'slate',
      },
      {
        start: '04:00',
        end: '06:00',
        days: 'daily',
        mode: 'episodes',
        title: 'The Outer Limits',
        seriesTitle: 'The Outer Limits',
        overflow: 'slate',
      },
      {
        start: '06:00',
        end: '08:00',
        days: 'daily',
        mode: 'episodes',
        title: "The Devil's Hour",
        seriesTitle: "The Devil's Hour",
        overflow: 'slate',
      },
      {
        start: '08:00',
        end: '14:00',
        days: 'daily',
        mode: 'slate',
        title: 'No programming',
      },
    ],
  };

  const spookyRule = await prisma.rule.findFirst({
    where: { rulesetId: spookyRules.id, kind: 'windowed-sources' },
  });
  if (spookyRule) {
    await prisma.rule.update({
      where: { id: spookyRule.id },
      data: { payload: spookyPayload, enabled: true },
    });
  } else {
    await prisma.rule.create({
      data: {
        rulesetId: spookyRules.id,
        name: 'Spooky 2h wheels',
        kind: 'windowed-sources',
        scope: 'local',
        sortOrder: 0,
        payload: spookyPayload,
      },
    });
  }

  await prisma.channelRuleset.upsert({
    where: {
      channelId_rulesetId: {
        channelId: spooky.id,
        rulesetId: spookyRules.id,
      },
    },
    update: { isActive: true, priority: 0 },
    create: {
      channelId: spooky.id,
      rulesetId: spookyRules.id,
      isActive: true,
      priority: 0,
    },
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
