'use client';

import { useState } from 'react';
import type { ChannelListItem } from '@channel-maker/contracts';

export function DesignerShell({
  channels,
  error,
}: {
  channels: ChannelListItem[];
  error: string | null;
}) {
  const [selectedId, setSelectedId] = useState(channels[0]?.id ?? null);
  const selected = channels.find((channel) => channel.id === selectedId) ?? null;

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
          {channels.length === 0 && !error ? (
            <p className="note">No channels yet.</p>
          ) : null}
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
        <section className="card" aria-label="Clock">
          <h2>Clock</h2>
          <article className="slot">
            <strong>Theme slot</strong>
            <span>No work yet. The title is still undecided.</span>
          </article>
        </section>
        <section className="card" aria-label="Preview">
          <h2>Preview</h2>
          {selected ? (
            <>
              <p className="preview">{selected.name}</p>
              <p className="note">
                {selected.slug} · {selected.isActive ? 'active' : 'inactive'} ·{' '}
                {selected._count?.slots ?? 0} slots
              </p>
            </>
          ) : (
            <p className="preview">Nothing selected</p>
          )}
          <p className="note">The pane follows the channel you select. It is not a player.</p>
        </section>
      </main>
    </>
  );
}
