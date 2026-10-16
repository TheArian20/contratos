'use client';
import { useEffect, useState } from 'react';
import { contractStatuses, type ContractState } from '@/lib/daily-operations';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { workCall, workError } from './work-shared';
type Data = ContractState & {
  history?: {
    status: string;
    reason: string;
    username: string;
    created: string;
  }[];
};
export function ContractStatus({
  kind,
  id,
  canEdit,
}: {
  kind: 'lot' | 'record';
  id: string;
  canEdit: boolean;
}) {
  const [data, setData] = useState<Data | null>(null),
    [status, setStatus] = useState('Por revisar'),
    [reason, setReason] = useState(''),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const guard = useUnsavedChanges(
    editing && (status !== data?.status || !!reason),
    busy,
  );
  const path = `contract-state?kind=${kind}&id=${encodeURIComponent(id)}`;
  const load = async () => {
    const result = await workCall<Data>(path);
    setData(result);
    setStatus(result.status);
    setReason('');
    setEditing(false);
    guard.markSaved();
    setError('');
  };
  useEffect(() => {
    let active = true;
    setData(null);
    setEditing(false);
    setReason('');
    setError('');
    void workCall<Data>(path)
      .then((r) => {
        if (active) {
          setData(r);
          setStatus(r.status);
        }
      })
      .catch((e) => {
        if (active) setError(workError(e));
      });
    return () => {
      active = false;
    };
  }, [path]);
  return (
    <section className="contract-status">
      <div className="section-heading">
        <h3>Estado del contrato</h3>
        <strong className="status-pill">{data?.status ?? 'Cargando…'}</strong>
        {canEdit && data && !editing && (
          <button className="secondary-button" onClick={() => setEditing(true)}>
            Cambiar estado
          </button>
        )}
      </div>
      <p>
        {kind === 'lot'
          ? 'Seguimiento del contrato de este lote.'
          : 'Seguimiento del contrato de este expediente del Excel.'}{' '}
        No cambia la deuda ni sustituye el contrato firmado. Los estados de
        otros lotes o expedientes se revisan por separado.
      </p>
      {error && (
        <div className="form-error" role="alert">
          <p>{error}</p>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => void load().catch((e) => setError(workError(e)))}
          >
            Descartar selección y cargar estado actual
          </button>
        </div>
      )}
      {editing && data && (
        <form
          className="secure-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              const next = await workCall<Data>('contract-state', {
                kind,
                id,
                status,
                reason,
                version: data.version,
              });
              setData(next);
              setEditing(false);
              setReason('');
              guard.markSaved();
            } catch (e) {
              setError(workError(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Nuevo estado
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {contractStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Motivo
            <textarea
              required
              maxLength={1500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ejemplo: contrato entregado para firma"
            />
          </label>
          <div className="work-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => {
                if (guard.canLeave()) {
                  setEditing(false);
                  setReason('');
                  setStatus(data.status);
                }
              }}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={busy || status === data.status}
            >
              {busy ? 'Guardando…' : 'Guardar estado'}
            </button>
          </div>
        </form>
      )}
      {!!data?.history?.length && (
        <details>
          <summary>Historial del estado · solo Administración</summary>
          {data.history.map((h, i) => (
            <p key={i}>
              {h.status} · @{h.username} ·{' '}
              {new Date(h.created).toLocaleString('es-PE')}
              <br />
              {h.reason}
            </p>
          ))}
        </details>
      )}
    </section>
  );
}
