import { zonedLocalToUtc } from './zoned-time';
import {
  parseWindowedSourcesPayload,
  planWindowedSources,
  type EpisodeRef,
} from './windowed-sources';

const TZ = 'America/Chicago';

function catalog(series: string, seasons: number[]): EpisodeRef[] {
  const out: EpisodeRef[] = [];
  seasons.forEach((count, seasonIndex) => {
    const season = seasonIndex + 1;
    for (let episode = 1; episode <= count; episode += 1) {
      const id = `${series}-S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
      out.push({
        title: id,
        workId: `w-${id}`,
        mediaAssetId: `a-${id}`,
        sourceUrl: `https://nas.local/tv/${series.toLowerCase()}/${id}.mkv`,
        season,
        episode,
        durationSec: 1800,
      });
    }
  });
  return out;
}

const payload = parseWindowedSourcesPayload({
  timeZone: TZ,
  episodeOrigin: '2026-09-01',
  items: [
    {
      start: '00:00',
      end: '05:00',
      days: 'daily',
      mode: 'live',
      title: 'WLS',
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
});

const liveByTitle = {
  WLS: {
    title: 'WLS',
    workId: 'w-wls',
    mediaAssetId: 'a-wls',
    sourceUrl: 'http://strangehub:9981/stream/channel/wls',
  },
};

const slateByTitle = {
  'No programming': {
    title: 'No programming',
    workId: 'w-slate',
    mediaAssetId: 'a-slate',
    sourceUrl: 'https://nas.local/slate/no-programming.mp4',
  },
};

const episodesBySeries = {
  SHOWA: catalog('SHOWA', [8, 10, 14]),
  SHOWB: catalog('SHOWB', [8, 10, 14]),
  SHOWC: catalog('SHOWC', [8, 10, 14]),
};

function dayRange(isoDate: string, days = 1) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const from = zonedLocalToUtc(TZ, year, month, day, 0, 0);
  const endDay = new Date(Date.UTC(year, month - 1, day + days));
  const to = zonedLocalToUtc(
    TZ,
    endDay.getUTCFullYear(),
    endDay.getUTCMonth() + 1,
    endDay.getUTCDate(),
    0,
    0,
  );
  return { from, to };
}

describe('planWindowedSources', () => {
  it('lays out one Chicago day: WLS, SHOWA x8, SHOWB x10, SHOWC x10, slate', () => {
    const planned = planWindowedSources({
      ...dayRange('2026-09-01'),
      payload,
      liveByTitle,
      episodesBySeries,
      slateByTitle,
    });

    expect(planned[0].title).toBe('WLS');
    expect(planned[0].startsAt.toISOString()).toBe(
      zonedLocalToUtc(TZ, 2026, 9, 1, 0, 0).toISOString(),
    );
    expect(planned[1].title).toBe('SHOWA-S01E01');
    expect(planned[8].title).toBe('SHOWA-S01E08');
    expect(planned[9].title).toBe('SHOWB-S01E01');
    expect(planned[18].title).toBe('SHOWB-S02E02');
    expect(planned[19].title).toBe('SHOWC-S01E01');
    expect(planned[planned.length - 1].title).toBe('No programming');
    expect(planned[planned.length - 1].startsAt.toISOString()).toBe(
      zonedLocalToUtc(TZ, 2026, 9, 1, 19, 0).toISOString(),
    );
  });

  it('wraps SHOWA to S01E01 on day 5 (8 episodes/day, 32 in series)', () => {
    const planned = planWindowedSources({
      ...dayRange('2026-09-05'),
      payload,
      liveByTitle,
      episodesBySeries,
      slateByTitle,
    });
    const showA = planned.filter((slot) => slot.title.startsWith('SHOWA-'));
    expect(showA.map((slot) => slot.title)).toEqual([
      'SHOWA-S01E01',
      'SHOWA-S01E02',
      'SHOWA-S01E03',
      'SHOWA-S01E04',
      'SHOWA-S01E05',
      'SHOWA-S01E06',
      'SHOWA-S01E07',
      'SHOWA-S01E08',
    ]);
  });

  it('wraps SHOWB mid-window on day 4 (10 episodes/day, 32 in series)', () => {
    const planned = planWindowedSources({
      ...dayRange('2026-09-04'),
      payload,
      liveByTitle,
      episodesBySeries,
      slateByTitle,
    });
    const showB = planned.filter((slot) => slot.title.startsWith('SHOWB-'));
    expect(showB[0].title).toBe('SHOWB-S03E13');
    expect(showB[1].title).toBe('SHOWB-S03E14');
    expect(showB[2].title).toBe('SHOWB-S01E01');
    expect(showB).toHaveLength(10);
  });

  it('keeps WLS and slate every day across two weeks', () => {
    const planned = planWindowedSources({
      ...dayRange('2026-09-01', 14),
      payload,
      liveByTitle,
      episodesBySeries,
      slateByTitle,
    });
    const nights = planned.filter((slot) => slot.title === 'WLS');
    const slates = planned.filter((slot) => slot.title === 'No programming');
    expect(nights).toHaveLength(14);
    expect(slates).toHaveLength(14);
  });
});
