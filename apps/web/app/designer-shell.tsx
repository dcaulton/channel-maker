'use client';

import { useEffect, useState } from 'react';
import {
  assetPageSchema,
  bindingListSchema,
  rulesetDetailSchema,
  scheduleSchema,
  windowedPayloadSchema,
  type AssetHit,
  type ChannelListItem,
  type Rule,
  type ScheduleSlot,
  type WindowedItem,
  type WindowedPayload,
} from '@channel-maker/contracts';
import { chicagoDayRange } from './chicago-day';
import { ClockPane } from './clock-pane';
import { PreviewPane } from './preview-pane';
import { RuleList } from './rule-list';
import { RuleSummary } from './rule-summary';
import { RulesetPane, type CopyableRule } from './ruleset-pane';

async function readJson(response: Response) {
  if (!response.ok) throw new Error(`Nest returned ${response.status}`);
  return response.json();
}

export function DesignerShell({
  channels,
  error,
}: {
  channels: ChannelListItem[];
  error: string | null;
}) {
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
  const [message, setMessage] = useState<string | null>(null);
  const [otherRules, setOtherRules] = useState<CopyableRule[]>([]);
  const [rulesetId, setRulesetId] = useState<string | null>(null);
  const selected = channels.find((channel) => channel.id === selectedId) ?? null;
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) ?? null;
  const selectedRule = rules.find((rule) => rule.id === selectedRuleId) ?? null;
  const day = chicagoDayRange();

  async function loadLog(channelId: string, signal?: AbortSignal) {
    const { from, to } = chicagoDayRange();
    const response = await fetch(
      `/nest/channels/${channelId}/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { signal },
    );
    return scheduleSchema.parse(await readJson(response));
  }

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    setLoading(true);
    setSlotError(null);
    setSelectedSlotId(null);
    setMessage(null);
    setSelectedIndex(null);
    setDraft(null);

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
        const all = (await readJson(
          await fetch('/nest/rules', { signal: controller.signal }),
        )) as {
          id: string;
          name: string;
          kind: string;
          rulesetId: string;
          ruleset?: { name: string };
        }[];
        setOtherRules(
          all
            .filter((item) => item.rulesetId !== detail.id)
            .map((item) => ({
              id: item.id,
              name: item.name,
              kind: item.kind,
              rulesetName: item.ruleset?.name ?? '',
            })),
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

  async function copyRule(sourceId: string) {
    if (!rulesetId) return;
    const source = await readJson(await fetch(`/nest/rules/${sourceId}`));
    const response = await fetch('/nest/rules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        rulesetId,
        name: source.name,
        kind: source.kind,
        payload: source.payload,
      }),
    });
    setMessage(response.ok ? `Copied ${source.name}.` : `Copy failed: ${response.status}`);
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
      return;
    }
    const response = await fetch(
      `/nest/media-assets/search?q=${encodeURIComponent(q)}&page=1&pageSize=20`,
    );
    if (!response.ok) return;
    setHits(assetPageSchema.parse(await response.json()).items);
  }

  return (
    <>
      <header className="top">
        <h1>Channel designer</h1>
        <span>{channels.length} channels from Nest</span>
      </header>
      <main className="board">
        <section className="card" aria-label="Channels">
          <h2>Channels</h2>
          {error ? <p className="note">{error}</p> : null}
          {channels.length === 0 && !error ? <p className="note">No channels yet.</p> : null}
          <ul className="channel-list">
            {channels.map((channel) => (
              <li key={channel.id}>
                <button
                  type="button"
                  className={channel.id === selectedId ? 'channel selected' : 'channel'}
                  onClick={() => setSelectedId(channel.id)}
                >
                  <strong>{channel.name}</strong>
                  <span>
                    {channel.slug} · {channel._count?.slots ?? 0} slots
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <div className="stack">
          <RuleList
            rules={rules}
            selectedId={selectedRuleId}
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
              message={message}
              onSelect={(index) => {
                setSelectedIndex(index);
                setDraft(payload?.items[index] ?? null);
              }}
              onDraft={setDraft}
              onSearch={search}
              onPick={(hit) => {
                if (!draft) return;
                const series = hit.work?.seriesTitle ?? hit.title;
                setDraft({ ...draft, title: series, seriesTitle: series });
              }}
              onSave={saveItem}
              onGenerate={generate}
              onDelete={deleteItem}
              onAddItem={addItem}
              onCopyRule={copyRule}
              otherRules={otherRules}
            />
          ) : selectedRule ? (
            <RuleSummary rule={selectedRule} />
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
