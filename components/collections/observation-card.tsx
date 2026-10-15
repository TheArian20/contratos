'use client';
import { useState } from 'react';
import { workCall, workError } from './work-shared';
export type Observation = {
  id: string;
  kind: string;
  body: string;
  author: string;
  created: string;
  pinned?: number;
};
export function ObservationCard({
  entry,
  canEdit,
  onRefresh,
}: {
  entry: Observation;
  canEdit: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <article
      className={entry.pinned ? 'source-group pinned-note' : 'source-group'}
    >
      <strong>
        {entry.pinned ? '★ Destacada · ' : ''}
        {entry.kind}
      </strong>
      <p className="observation-text">{entry.body}</p>
      <small>
        {entry.author} · {new Date(entry.created).toLocaleString('es-PE')}
      </small>
      {canEdit && (
        <button
          className="secondary-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              await workCall('entry-pin', {
                id: entry.id,
                pinned: !entry.pinned,
              });
              await onRefresh();
            } catch (e) {
              setError(workError(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy
            ? 'Guardando…'
            : entry.pinned
              ? 'Quitar destacado'
              : 'Destacar observación'}
        </button>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </article>
  );
}
