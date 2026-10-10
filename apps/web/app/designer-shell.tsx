'use client';

import { useEffect, useState } from 'react';
import { scheduleSchema, type ChannelListItem, type ScheduleSlot } from '@channel-maker/contracts';
import { chicagoDayRange } from './chicago-day';
import { ClockPane } from './clock-pane';

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
  const selected = channels.find((channel) => channel.id === selectedId) ?? null;
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) ?? null;
  const day = chicagoDayRange();

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    const { from, to } = chicagoDayRange();
    setLoading(true);
    setSlotError(null);
    setSelectedSlotId(null);

    fetch(
      `/nest/channels/${selectedId}/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(`Nest returned ${response.status}`);
        return scheduleSchema.parse(await response.json());
      })
      .then((next) => {
        setSlots(next);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setSlots([]);
        setSlotError(cause instanceof Error ? cause.message : 'request failed');
        setLoading(false);
      });

    return () => controller.abort();
  }, [selectedId]);

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
        <ClockPane
          label={day.label}
          slots={slots}
          loading={loading}
          error={slotError}
          selectedSlotId={selectedSlotId}
          onSelect={(slot) => setSelectedSlotId(slot.id)}
        />
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
