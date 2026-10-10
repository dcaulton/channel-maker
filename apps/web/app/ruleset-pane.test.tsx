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
  },
];

describe('RulesetPane', () => {
  it('lists a windowed item', () => {
    const html = renderToStaticMarkup(
      <RulesetPane
        name="philosophy-prime"
        items={items}
        selectedIndex={null}
        draft={null}
        hits={[]}
        message={null}
        onSelect={() => undefined}
        onDraft={() => undefined}
        onSearch={() => undefined}
        onPick={() => undefined}
        onSave={() => undefined}
        onGenerate={() => undefined}
      />,
    );
    expect(html).toContain('20:00–22:00');
    expect(html).toContain('Justice');
    expect(html).toContain('episodes');
  });
});
