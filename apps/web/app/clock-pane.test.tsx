import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ScheduleSlot } from '@channel-maker/contracts';
import { ClockPane } from './clock-pane';

const slots: ScheduleSlot[] = [
  {
    id: 'empty',
    startsAt: '2026-10-10T01:00:00.000Z',
    endsAt: '2026-10-10T02:00:00.000Z',
    title: 'Philosophy block',
    mediaAsset: null,
  },
  {
    id: 'playable',
    startsAt: '2026-10-10T02:00:00.000Z',
    endsAt: '2026-10-10T03:00:00.000Z',
    title: 'Justice 1',
    mediaAsset: {
      id: 'asset-1',
      title: 'Justice lecture 1',
      sourceUrl: 'http://10.0.0.89:8088/philosophy/justice-1.webm',
      work: { id: 'work-1', title: 'Justice' },
    },
  },
];

describe('ClockPane', () => {
  it('shows a theme slot and a playable slot', () => {
    const html = renderToStaticMarkup(
      <ClockPane
        label="Sat, Oct 10"
        slots={slots}
        loading={false}
        error={null}
        selectedSlotId="playable"
        onSelect={() => undefined}
      />,
    );

    expect(html).toContain('Philosophy block');
    expect(html).toContain('No work yet');
    expect(html).toContain('Justice');
    expect(html).not.toContain('playlist.m3u');
  });
});
