import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Rule } from '@channel-maker/contracts';
import { RuleList } from './rule-list';

const rules: Rule[] = [
  { id: 'w', name: 'Dayparts', kind: 'windowed-sources', enabled: true, payload: {} },
  { id: 'r', name: 'Locals', kind: 'rotate-tv-streams', enabled: true, payload: {} },
  { id: 'l', name: 'Suggest', kind: 'suggest', enabled: false, payload: {} },
];

describe('RuleList', () => {
  it('names each kind and marks a rule with no planner', () => {
    const html = renderToStaticMarkup(
      <RuleList rules={rules} selectedId="w" onSelect={() => undefined} />,
    );
    expect(html).toContain('windowed-sources');
    expect(html).toContain('rotate-tv-streams');
    expect(html).toContain('no planner');
  });
});
