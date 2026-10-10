import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ChannelListItem } from '@channel-maker/contracts';
import { ChannelList } from './channel-list';

const channels: ChannelListItem[] = [
  { id: 'c1', name: 'Spooky Stories', slug: 'spooky-stories', description: 'anthology', isActive: true, _count: { slots: 437 } },
];

describe('ChannelList', () => {
  it('lists a channel and offers add', () => {
    const html = renderToStaticMarkup(
      <ChannelList
        channels={channels}
        selectedId="c1"
        error={null}
        onSelect={() => undefined}
        onSave={() => undefined}
        onDelete={() => undefined}
        onCreate={() => undefined}
      />,
    );
    expect(html).toContain('Spooky Stories');
    expect(html).toContain('Add channel');
  });
});
