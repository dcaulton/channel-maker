'use client';

import { useState } from 'react';
import type { ChannelListItem } from '@channel-maker/contracts';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function ChannelList({
  channels,
  selectedId,
  error,
  onSelect,
  onSave,
  onDelete,
  onCreate,
}: {
  channels: ChannelListItem[];
  selectedId: string | null;
  error: string | null;
  onSelect: (id: string) => void;
  onSave: (channel: ChannelListItem) => void;
  onDelete: (id: string) => void;
  onCreate: (input: { name: string; slug: string; description: string }) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ChannelListItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  return (
    <section className="card" aria-label="Channels">
      <header className="pane-head">
        <h2>Channels</h2>
        <button type="button" onClick={() => setAdding((open) => !open)}>
          Add channel
        </button>
      </header>
      {error ? <p className="note">{error}</p> : null}
      {channels.length === 0 && !error ? <p className="note">No channels yet.</p> : null}
      <ul className="channel-list">
        {channels.map((channel) => {
          const open = expandedId === channel.id;
          const shown = open && draft ? draft : channel;
          return (
            <li key={channel.id}>
              <button
                type="button"
                className={channel.id === selectedId ? 'channel selected' : 'channel'}
                onClick={() => {
                  onSelect(channel.id);
                  if (open) {
                    setExpandedId(null);
                    setDraft(null);
                    return;
                  }
                  setExpandedId(channel.id);
                  setDraft(channel);
                }}
              >
                <strong>{shown.name}</strong>
                <span>
                  {shown.slug} · {channel._count?.slots ?? 0} slots
                </span>
              </button>
              {open && draft ? (
                <form
                  className="edit"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onSave(draft);
                  }}
                >
                  <label>
                    Name
                    <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  </label>
                  <label>
                    Slug
                    <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
                  </label>
                  <label>
                    Description
                    <input
                      value={draft.description ?? ''}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    />
                  </label>
                  <label>
                    Active
                    <input
                      type="checkbox"
                      checked={draft.isActive}
                      onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                    />
                  </label>
                  <div className="actions">
                    <button type="submit">Save</button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => {
                        if (window.confirm(`Delete ${channel.name}?`)) onDelete(channel.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
      {adding ? (
        <form
          className="edit"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate({ name, slug: slug || slugify(name), description });
            setName('');
            setSlug('');
            setDescription('');
            setAdding(false);
          }}
        >
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Slug
            <input value={slug} placeholder={slugify(name)} onChange={(e) => setSlug(e.target.value)} />
          </label>
          <label>
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <button type="submit">Create</button>
        </form>
      ) : null}
    </section>
  );
}
