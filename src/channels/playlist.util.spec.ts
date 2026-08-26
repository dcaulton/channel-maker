import { buildM3u } from './playlist.util';

describe('buildM3u', () => {
  const baseSlot = {
    title: 'Slot title',
    startsAt: new Date('2026-08-25T23:00:00.000Z'),
    endsAt: new Date('2026-08-26T01:00:00.000Z'),
    mediaAsset: {
      title: 'Noir Feature',
      sourceUrl: 'https://nas.local/films/noir1.mkv',
      needsVpn: false,
      vpnCountry: null,
    },
  };

  it('builds a basic playlist with file URL', () => {
    const m3u = buildM3u([baseSlot], { channelName: 'Classic' });

    expect(m3u.startsWith('#EXTM3U\n')).toBe(true);
    expect(m3u).toContain('#EXTINF:7200,Noir Feature');
    expect(m3u).toContain('https://nas.local/films/noir1.mkv');
  });

  it('rewrites VPN assets when proxy base is set', () => {
    const slot = {
      ...baseSlot,
      mediaAsset: {
        title: 'BBC',
        sourceUrl: 'https://example.com/live.m3u8',
        needsVpn: true,
        vpnCountry: 'GB',
      },
    };

    const m3u = buildM3u([slot], {
      channelName: 'News',
      vpnProxyBaseUrl: 'http://proxy.local:8080',
    });

    expect(m3u).toContain(
      'http://proxy.local:8080/play?country=GB&target=https%3A%2F%2Fexample.com%2Flive.m3u8',
    );
  });

  it('marks missing source when VPN required but no proxy', () => {
    const slot = {
      ...baseSlot,
      mediaAsset: {
        title: 'BBC',
        sourceUrl: 'https://example.com/live.m3u8',
        needsVpn: true,
        vpnCountry: 'GB',
      },
    };

    const m3u = buildM3u([slot], { channelName: 'News' });
    expect(m3u).toContain('# NO_SOURCE');
  });

  it('handles slot with no media asset', () => {
    const slot = {
      title: 'Gap',
      startsAt: new Date('2026-08-25T23:00:00.000Z'),
      endsAt: new Date('2026-08-25T23:30:00.000Z'),
      mediaAsset: null,
    };

    const m3u = buildM3u([slot], { channelName: 'Classic' });
    expect(m3u).toContain('#EXTINF:1800,Gap');
    expect(m3u).toContain('# NO_SOURCE');
  });
});
