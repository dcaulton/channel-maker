import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { WindowedItem } from '@channel-maker/contracts';
import { RulesetPane } from './ruleset-pane';

const items: WindowedItem[] = [
  {
    start: '20:00',
    end: '22:00',
    days: 'daily',
    mode: 'episodes',
    title: 'Justice',
    seriesTitle: 'Justice',
    overflow: 'slate',
    slateTitle: 'No programming',
  },
];

describe('RulesetPane', () => {
  it('expands a row to its metadata and offers delete', () => {
    const html = renderToStaticMarkup(
      <RulesetPane
        name="philosophy-prime"
        items={items}
        selectedIndex={0}
        draft={items[0]!}
        hits={[]}
        message={null}
        onSelect={() => undefined}
        onDraft={() => undefined}
        onSearch={() => undefined}
        onPick={() => undefined}
        onSave={() => undefined}
        onGenerate={() => undefined}
        onDelete={() => undefined}
        onAddItem={() => undefined}
      />,
    );
    expect(html).toContain('Delete');
    expect(html).toContain('No programming');
    expect(html).toContain('windowed sources designer: philosophy-prime');
    expect(html).toContain('episodes');
    expect(html).not.toContain('rotate-tv-streams');
  });
});
