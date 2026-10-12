'use client';
import { useState } from 'react';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { workCall, workError } from './work-shared';

export function PersonObservation({
  sources,
  onSaved,
}: {
  sources: { id: string; label: string }[];
  onSaved: () => Promise<void>;
}) {
  const [body, setBody] = useState(''),
    [recordId, setRecordId] = useState(sources[0]?.id ?? '');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const guard = useUnsavedChanges(!!body.trim(), busy);
  return (
    <form
      className="secure-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError('');
        setNotice('');
        try {
          await workCall('entry', {
            recordId,
            kind: 'Gestión',
            body: body.trim(),
          });
          guard.markSaved();
          setBody('');
          setNotice('Observación guardada.');
          try {
            await onSaved();
          } catch {
            setError(
              'La observación se guardó. Actualiza la página para verla en la lista.',
            );
          }
        } catch (err) {
          setError(workError(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Añadir observación</h3>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && <output className="notice">{notice}</output>}
      {sources.length > 1 && (
        <label>
          Expediente al que corresponde
          <select
            value={recordId}
            disabled={busy}
            onChange={(e) => setRecordId(e.target.value)}
            required
          >
            {sources.map((s) => (
              <option value={s.id} key={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Observación
        <textarea
          rows={4}
          maxLength={1500}
          value={body}
          disabled={busy}
          required
          onChange={(e) => {
            setBody(e.target.value);
            setNotice('');
          }}
          placeholder="Escribe lo que el equipo necesita saber de esta persona."
        />
      </label>
      <button
        className="primary-button"
        disabled={busy || !body.trim() || !recordId}
      >
        {busy ? 'Guardando…' : 'Guardar observación'}
      </button>
    </form>
  );
}
