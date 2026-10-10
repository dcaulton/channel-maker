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
  type ScheduleSlot,
  type WindowedItem,
  type WindowedPayload,
} from '@channel-maker/contracts';
import { chicagoDayRange } from './chicago-day';
import { ClockPane } from './clock-pane';
import { RulesetPane } from './ruleset-pane';

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
  const [rulesetName, setRulesetName] = useState<string | null>(null);
  const [ruleId, setRuleId] = useState<string | null>(null);
  const [payload, setPayload] = useState<WindowedPayload | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<WindowedItem | null>(null);
  const [hits, setHits] = useState<AssetHit[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const selected = channels.find((channel) => channel.id === selectedId) ?? null;
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) ?? null;
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
          setRulesetName(null);
          setRuleId(null);
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
        const rule = detail.rules.find((item) => item.kind === 'windowed-sources');
        setRulesetName(detail.name);
        setRuleId(rule?.id ?? null);
        setPayload(rule ? windowedPayloadSchema.parse(rule.payload) : null);
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
    if (!ruleId || !payload || selectedIndex === null || !draft) return;
    const items = payload.items.map((item, index) =>
      index === selectedIndex ? draft : item,
    );
    const next = { ...payload, items };
    const response = await fetch(`/nest/rules/${ruleId}`, {
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
          <RulesetPane
            name={rulesetName}
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
          />
          <ClockPane
            label={day.label}
            slots={slots}
            loading={loading}
            error={slotError}
            selectedSlotId={selectedSlotId}
            onSelect={(slot) => setSelectedSlotId(slot.id)}
          />
        </div>
        <section className="card" aria-label="Preview">
          <h2>Preview</h2>
          {selectedSlot ? (
            <>
              <p className="preview">{selectedSlot.title}</p>
              <p className="note">
                {selectedSlot.mediaAsset?.sourceUrl
                  ? (selectedSlot.mediaAsset.work?.title ?? selectedSlot.mediaAsset.title)
                  : 'Theme slot. No playable URL yet.'}
              </p>
            </>
          ) : selected ? (
            <>
              <p className="preview">{selected.name}</p>
              <p className="note">Select a slot to inspect it.</p>
            </>
          ) : (
            <p className="preview">Nothing selected</p>
          )}
        </section>
      </main>
    </>
  );
}
