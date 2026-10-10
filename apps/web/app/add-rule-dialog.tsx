'use client';

import { useState } from 'react';

export function AddRuleDialog({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (name: string, kind: 'windowed-sources' | 'rotate-tv-streams') => void;
}) {
  const [name, setName] = useState('New rule');
  const [kind, setKind] = useState<'windowed-sources' | 'rotate-tv-streams'>('windowed-sources');
  return (
    <form
      className="dialog"
      aria-label="Add a rule"
      onSubmit={(event) => {
        event.preventDefault();
        onCreate(name.trim() || 'New rule', kind);
      }}
    >
      <h2>Add a rule</h2>
      <label>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Kind
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as typeof kind)}
        >
          <option value="windowed-sources">windowed-sources</option>
          <option value="rotate-tv-streams">rotate-tv-streams</option>
        </select>
      </label>
      <div className="actions">
        <button type="submit">Add</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
