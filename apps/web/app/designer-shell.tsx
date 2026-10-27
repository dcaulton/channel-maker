'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  assetPageSchema,
  bindingListSchema,
  rulesetDetailSchema,
  scheduleSchema,
  windowedPayloadSchema,
  workPageSchema,
  type AssetHit,
  type ChannelListItem,
  type Rule,
  type ScheduleSlot,
  type WindowedItem,
  type WindowedPayload,
  type WorkHit,
} from '@channel-maker/contracts';
import { chicagoDayRange } from './chicago-day';
import { ChannelList } from './channel-list';
import { ClockPane } from './clock-pane';
import { PreviewPane } from './preview-pane';
import { RuleList } from './rule-list';
import { RuleSummary } from './rule-summary';
import { RulesetPane } from './ruleset-pane';
import { AddRuleDialog } from './add-rule-dialog';

async function readJson(response: Response) {
  if (!response.ok) throw new Error(`Nest returned ${response.status}`);
  return response.json();
}

function channelListItemFrom(body: {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
}): ChannelListItem {
  return {
    id: body.id,
    name: body.name,
    slug: body.slug,
    description: body.description,
    isActive: body.isActive,
    _count: { slots: 0 },
  };
}

export function DesignerShell({
  channels,
  error,
}: {
  channels: ChannelListItem[];
  error: string | null;
}) {
  const router = useRouter();
  const [list, setList] = useState(channels);
  const [selectedId, setSelectedId] = useState(channels[0]?.id ?? null);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [payload, setPayload] = useState<WindowedPayload | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<WindowedItem | null>(null);
  const [hits, setHits] = useState<AssetHit[]>([]);
  const [works, setWorks] = useState<WorkHit[]>([]);
  const [browse, setBrowse] = useState<'works' | 'assets'>('works');
  const [message, setMessage] = useState<string | null>(null);
  const [addingRule, setAddingRule] = useState(false);
  const [rulesetId, setRulesetId] = useState<string | null>(null);
  const selected = list.find((channel) => channel.id === selectedId) ?? null;
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) ?? null;
  const selectedRule = rules.find((rule) => rule.id === selectedRuleId) ?? null;
  const day = chicagoDayRange();

  useEffect(() => {
    setList(channels);
  }, [channels]);

  async function saveChannel(channel: ChannelListItem) {
    const response = await fetch(`/nest/channels/${channel.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: channel.name,
        slug: channel.slug,
        description: channel.description,
        isActive: channel.isActive,
      }),
    });
    if (!response.ok) {
      setSlotError(`Channel save failed: ${response.status}`);
      return;
    }
    setList((current) => current.map((item) => (item.id === channel.id ? channel : item)));
    router.refresh();
  }

  async function deleteChannel(id: string) {
    const response = await fetch(`/nest/channels/${id}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) {
      setSlotError(`Channel delete failed: ${response.status}`);
      return;
    }
    setList((current) => current.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId(null);
    router.refresh();
  }

  async function createChannel(input: { name: string; slug: string; description: string }) {
    const response = await fetch('/nest/channels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      setSlotError(`Channel create failed: ${response.status}`);
      return;
    }
    const created = channelListItemFrom(await response.json());
    setList((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedId(created.id);
    router.refresh();
  }

  async function deleteRule(rule: Rule) {
    const response = await fetch(`/nest/rules/${rule.id}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) {
      setMessage(`Rule delete failed: ${response.status}`);
      return;
    }
    setRules((current) => current.filter((item) => item.id !== rule.id));
    if (selectedRuleId === rule.id) setSelectedRuleId(null);
  }

  async function loadLog(channelId: string, signal?: AbortSignal) {
    const { from, to } = chicagoDayRange();
    const response = await fetch(
      `/nest/channels/${channelId}/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { signal },
    );
    return scheduleSchema.parse(await readJson(response));
  }

  useEffect(() => {
    setRules([]);
    setSelectedRuleId(null);
    setPayload(null);
    setRulesetId(null);
    setSlots([]);
    setSelectedSlotId(null);
    setSelectedIndex(null);
    setDraft(null);
    setHits([]);
    setWorks([]);
    setMessage(null);
    setAddingRule(false);
    setSlotError(null);
    if (!selectedId) return;
    const controller = new AbortController();
    setLoading(true);

    Promise.all([
      loadLog(selectedId, controller.signal),
      fetch('/nest/channel-rulesets', { signal: controller.signal }).then(readJson),
    ])
      .then(async ([nextSlots, bindingsBody]) => {
        setSlots(nextSlots);
        const bindings = bindingListSchema.parse(bindingsBody);
        const binding = bindings.find(
          (item) => item.channelId === selectedId && item.isActive,
        );
        if (!binding) {
          setRules([]);
          setSelectedRuleId(null);
          setPayload(null);
          return;
        }
        const detail = rulesetDetailSchema.parse(
          await readJson(
            await fetch(`/nest/rulesets/${binding.rulesetId}`, {
              signal: controller.signal,
            }),
          ),
        );
        setRules(detail.rules);
        setRulesetId(detail.id);
        const windowed = detail.rules.find((rule) => rule.kind === 'windowed-sources');
        const first = windowed ?? detail.rules[0] ?? null;
        setSelectedRuleId(first?.id ?? null);
        setPayload(
          windowed ? windowedPayloadSchema.parse(windowed.payload) : null,
        );
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setSlots([]);
        setSlotError(cause instanceof Error ? cause.message : 'request failed');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [selectedId]);

  async function saveItem() {
    if (!selectedRule || !payload || selectedIndex === null || !draft) return;
    const items = payload.items.map((item, index) =>
      index === selectedIndex ? draft : item,
    );
    const next = { ...payload, items };
    const response = await fetch(`/nest/rules/${selectedRule.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payload: next }),
    });
    if (!response.ok) {
      setMessage(`Save failed: ${response.status}`);
      return;
    }
    setPayload(next);
    setMessage('Item saved. Generate to rewrite the log.');
  }

  async function persist(next: WindowedPayload, note: string) {
    if (!selectedRule) return;
    const response = await fetch(`/nest/rules/${selectedRule.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payload: next }),
    });
    if (!response.ok) {
      setMessage(`Save failed: ${response.status}`);
      return;
    }
    setPayload(next);
    setMessage(note);
  }

  async function deleteItem(index: number) {
    if (!payload) return;
    const items = payload.items.filter((_, i) => i !== index);
    setSelectedIndex(null);
    setDraft(null);
    await persist({ ...payload, items }, 'Item deleted. Generate to rewrite the log.');
  }

  async function reorder(from: number, to: number) {
    if (!payload) return;
    const items = payload.items.map((item) => ({ ...item }));
    const a = items[from];
    const b = items[to];
    if (!a || !b) return;
    [a.start, b.start] = [b.start, a.start];
    [a.end, b.end] = [b.end, a.end];
    await persist({ ...payload, items }, 'Start times swapped. Generate to rewrite the log.');
  }

  function addItem(mode: WindowedItem['mode']) {
    if (!payload) return;
    const item: WindowedItem = {
      start: '20:00',
      end: '22:00',
      days: 'daily',
      mode,
      title: 'New item',
    };
    const items = [...payload.items, item];
    setPayload({ ...payload, items });
    setSelectedIndex(items.length - 1);
    setDraft(item);
    setMessage('New item is local until you save it.');
  }

  async function ensureRuleset(): Promise<string | null> {
    if (rulesetId) return rulesetId;
    if (!selected) {
      setMessage('Select a channel first.');
      return null;
    }
    const slug = `${selected.slug}-rules`;
    const created = await fetch('/nest/rulesets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: `${selected.name} rules`, slug }),
    });
    if (!created.ok) {
      setMessage(`Could not create a ruleset: ${created.status}`);
      return null;
    }
    const ruleset = await created.json();
    const binding = await fetch('/nest/channel-rulesets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ channelId: selected.id, rulesetId: ruleset.id }),
    });
    if (!binding.ok) {
      setMessage(`Could not bind the ruleset: ${binding.status}`);
      return null;
    }
    setRulesetId(ruleset.id);
    return ruleset.id;
  }

  async function createRule(name: string, kind: 'windowed-sources' | 'rotate-tv-streams') {
    const targetRulesetId = await ensureRuleset();
    if (!targetRulesetId) return;
    const payload =
      kind === 'windowed-sources'
        ? {
            timeZone: 'America/Chicago',
            episodeOrigin: '2026-10-10',
            items: [{ start: '20:00', end: '22:00', days: 'daily', mode: 'episodes', title: 'New item' }],
          }
        : { streamTitles: ['New stream'], slotDurationSec: 7200 };
    const response = await fetch('/nest/rules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rulesetId: targetRulesetId, name, kind, payload }),
    });
    if (!response.ok) {
      setMessage(`Add rule failed: ${response.status}`);
      return;
    }
    const created = await response.json();
    setRules((current) => [...current, created]);
    setSelectedRuleId(created.id);
    setAddingRule(false);
    setMessage(`Added ${name}.`);
  }

  async function generate() {
    if (!selectedId) return;
    const { from, to } = chicagoDayRange();
    const response = await fetch(`/nest/channels/${selectedId}/fill`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from, to }),
    });
    if (!response.ok) {
      setMessage(`Generate failed: ${response.status}`);
      return;
    }
    setSlots(await loadLog(selectedId));
    setMessage('Log rewritten from the ruleset.');
  }

  async function search(q: string) {
    if (q.trim().length < 2) {
      setHits([]);
      setWorks([]);
      return;
    }
    const path = browse === 'works' ? '/nest/works/search' : '/nest/media-assets/search';
    const response = await fetch(
      `${path}?q=${encodeURIComponent(q)}&page=1&pageSize=20`,
    );
    if (!response.ok) return;
    const body = await response.json();
    if (browse === 'works') setWorks(workPageSchema.parse(body).items);
    else setHits(assetPageSchema.parse(body).items);
  }

  return (
    <>
      <header className="top">
        <h1>Channel designer</h1>
        <span>{list.length} channels from Nest</span>
      </header>
      <main className="board">
        <ChannelList
          channels={list}
          selectedId={selectedId}
          error={error}
          onSelect={setSelectedId}
          onSave={saveChannel}
          onDelete={deleteChannel}
          onCreate={createChannel}
        />
        <div className="stack">
          <RuleList
            rules={rules}
            selectedId={selectedRuleId}
            onAdd={() => setAddingRule(true)}
            onDelete={deleteRule}
            onSelect={(rule) => {
              setSelectedRuleId(rule.id);
              setSelectedIndex(null);
              setDraft(null);
              setPayload(
                rule.kind === 'windowed-sources'
                  ? windowedPayloadSchema.parse(rule.payload)
                  : null,
              );
            }}
          />
          {selectedRule?.kind === 'windowed-sources' ? (
            <RulesetPane
              name={selectedRule.name}
              items={payload?.items ?? []}
              selectedIndex={selectedIndex}
              draft={draft}
              hits={hits}
              works={works}
              browse={browse}
              message={message}
              onSelect={(index) => {
                if (selectedIndex === index) {
                  setSelectedIndex(null);
                  setDraft(null);
                  return;
                }
                setSelectedIndex(index);
                setDraft(payload?.items[index] ?? null);
              }}
              onDraft={setDraft}
              onSearch={search}
              onBrowse={setBrowse}
              onPick={(hit) => {
                if (!draft) return;
                const series = hit.work?.seriesTitle ?? hit.title;
                setDraft({ ...draft, title: series, seriesTitle: series });
              }}
              onPickWork={(work) => {
                if (!draft) return;
                const series = work.seriesTitle ?? work.title;
                setDraft({ ...draft, title: series, seriesTitle: series });
              }}
              onSave={saveItem}
              onGenerate={generate}
              onDelete={deleteItem}
              onAddItem={addItem}
              onReorder={reorder}
            />
          ) : selectedRule ? (
            <RuleSummary rule={selectedRule} />
          ) : null}
          {addingRule ? (
            <AddRuleDialog onCancel={() => setAddingRule(false)} onCreate={createRule} />
          ) : null}
          <ClockPane
            label={day.label}
            slots={slots}
            loading={loading}
            error={slotError}
            selectedSlotId={selectedSlotId}
            onSelect={(slot) => setSelectedSlotId(slot.id)}
          />
        </div>
        <PreviewPane
          title={selectedSlot?.title ?? selected?.name ?? null}
          sourceUrl={selectedSlot?.mediaAsset?.sourceUrl ?? null}
          fallback={
            selected
              ? 'Select a log row to play it.'
              : 'Select a channel.'
          }
        />
      </main>
    </>
  );
}
