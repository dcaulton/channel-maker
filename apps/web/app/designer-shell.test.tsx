import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ChannelListItem } from '@channel-maker/contracts';
import { DesignerShell } from './designer-shell';

const channels: ChannelListItem[] = [
  {
    id: 'cmuoqqeue00f4hlb96ar2k9xs',
    name: 'Philosophy Prime',
    slug: 'philosophy-prime',
    isActive: true,
    _count: { slots: 18 },
  },
  {
    id: 'spooky',
    name: 'Spooky Stories',
    slug: 'spooky-stories',
    isActive: true,
    _count: { slots: 9 },
  },
];

describe('DesignerShell', () => {
  it('renders channels from props and previews the first', () => {
    const html = renderToStaticMarkup(
      <DesignerShell channels={channels} error={null} />,
    );

    expect(html).toContain('Philosophy Prime');
    expect(html).toContain('Spooky Stories');
    expect(html).toContain('philosophy-prime · 18 slots');
    expect(html).not.toContain('Nothing selected');
    expect(html).not.toContain('playlist.m3u');
  });

  it('shows the Nest error instead of pretending the list is empty', () => {
    const html = renderToStaticMarkup(
      <DesignerShell channels={[]} error="Could not reach Nest at http://127.0.0.1:3000" />,
    );

    expect(html).toContain('Could not reach Nest');
    expect(html).toContain('Nothing selected');
  });
});
