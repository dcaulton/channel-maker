import { alignDown, planRotateTvStreams } from './rotate-tv-streams';

describe('planRotateTvStreams', () => {
  const streams = [
    {
      title: 'WLS',
      workId: 'w1',
      mediaAssetId: 'a1',
      sourceUrl: 'http://strangehub:9981/stream/channel/wls',
    },
    {
      title: 'ME-TV',
      workId: 'w2',
      mediaAssetId: 'a2',
      sourceUrl: 'http://strangehub:9981/stream/channel/metv',
    },
    {
      title: 'WTTW',
      workId: 'w3',
      mediaAssetId: 'a3',
      sourceUrl: 'http://strangehub:9981/stream/channel/wttw',
    },
  ];
  const payload = {
    streamTitles: streams.map((item) => item.title),
    slotDurationSec: 7200,
  };

  it('aligns down to a 2h epoch boundary', () => {
    const aligned = alignDown(new Date('2026-09-01T17:40:00.000Z'), 7200);
    expect(aligned.toISOString()).toBe('2026-09-01T16:00:00.000Z');
  });

  it('rotates WLS → ME-TV → WTTW and repeats', () => {
    const planned = planRotateTvStreams({
      from: new Date('2026-09-01T16:00:00.000Z'),
      to: new Date('2026-09-01T22:00:00.000Z'),
      payload,
      streams,
    });

    expect(planned.map((slot) => slot.title)).toEqual(['WTTW', 'WLS', 'ME-TV']);
    expect(planned[0].sourceUrl).toContain('/wttw');
    expect(planned[0].startsAt.toISOString()).toBe('2026-09-01T16:00:00.000Z');
    expect(planned[2].endsAt.toISOString()).toBe('2026-09-01T22:00:00.000Z');
  });

  it('is stable: same window always yields the same stream', () => {
    const first = planRotateTvStreams({
      from: new Date('2026-09-01T18:00:00.000Z'),
      to: new Date('2026-09-01T20:00:00.000Z'),
      payload,
      streams,
    });
    const second = planRotateTvStreams({
      from: new Date('2026-09-01T18:00:00.000Z'),
      to: new Date('2026-09-01T20:00:00.000Z'),
      payload,
      streams,
    });
    expect(first[0].title).toBe(second[0].title);
    expect(first[0].title).toBe('WLS');
  });
});
