'use client';
import { useState } from 'react';
import { commitmentStatus } from '@/lib/daily-operations';
import { matchesPerson, matchesSearch } from '@/lib/person-search';
import {
  soles,
  todayLocal,
  type WorkState,
  type WorkTask,
} from '@/lib/work-ledger';
import { workError, type WorkSave } from './work-shared';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export function CommitmentsPanel({
  state,
  canEdit,
  onSave,
  onPerson,
  personId = '',
}: {
  state: WorkState;
  canEdit: boolean;
  onSave: WorkSave;
  onPerson: (id: string) => void;
  personId?: string;
}) {
  const [filter, setFilter] = useState('Pendientes'),
    [query, setQuery] = useState(''),
    [editing, setEditing] = useState<WorkTask | 'new' | null>(null),
    [statusTask, setStatusTask] = useState<WorkTask | null>(null),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const today = todayLocal();
  const rows = state.tasks
    .filter(
      (t) =>
        t.kind === 'Compromiso de pago' &&
        (!personId || t.person_id === personId),
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  const visible = rows.filter(
    (t) =>
      (filter === 'Todos' ||
        (filter === 'Pendientes'
          ? !t.done
          : commitmentStatus(t, today) === filter)) &&
      matchesSearch(query, [
        t.description,
        state.people.find((p) => p.id === t.person_id)?.name,
        state.people.find((p) => p.id === t.person_id)?.document,
      ]),
  );
  return (
    <section className="panel secure-content">
      <div className="section-heading">
        <h2>Compromisos de pago</h2>
        {canEdit && (
          <button className="primary-button" onClick={() => setEditing('new')}>
            Nuevo compromiso
          </button>
        )}
      </div>
      <p>
        Una promesa de pago no reduce la deuda. Si recibiste dinero, regístralo
        desde la ficha. «Atendido» solo cierra el seguimiento.
      </p>
      <div className="report-metrics">
        {['Vencido', 'Para hoy', 'Próximo'].map((s) => (
          <button
            key={s}
            className="secondary-button"
            onClick={() => setFilter(s)}
          >
            {s}: {rows.filter((t) => commitmentStatus(t, today) === s).length}
          </button>
        ))}
      </div>
      <div className="secure-filters">
        <label>
          Estado
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {[
              'Pendientes',
              'Vencido',
              'Para hoy',
              'Próximo',
              'Atendido',
              'Todos',
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Buscar
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre, DNI o descripción"
          />
        </label>
      </div>
      {!visible.length && <p>No hay compromisos con estos filtros.</p>}
      {visible.map((t) => {
        const p = state.people.find((p) => p.id === t.person_id),
          a = state.accounts.find((a) => a.id === t.account_id),
          l = state.lots.find((l) => l.id === a?.lot_id);
        return (
          <article className="agenda-work-row" key={t.id}>
            <div>
              <strong>{p?.name || 'Persona no disponible'}</strong>
              <p>
                {soles(t.amount ?? 0)} · {t.due} ·{' '}
                <strong
                  className={
                    commitmentStatus(t, today) === 'Vencido'
                      ? 'overdue-text'
                      : ''
                  }
                >
                  {commitmentStatus(t, today)}
                </strong>
              </p>
              <p>
                {l
                  ? `${l.project} · ${l.name} · ${a?.concept}`
                  : 'Sin cuenta específica: revisar con la persona'}
              </p>
              <p className="observation-text">{t.description}</p>
              <small>Anotado por {t.author}</small>
            </div>
            <div className="work-actions">
              <button
                className="secondary-button"
                onClick={() => onPerson(t.person_id)}
              >
                Abrir ficha / ver pagos
              </button>
              {canEdit && (
                <>
                  <button
                    className="secondary-button"
                    onClick={() => setEditing(t)}
                  >
                    Modificar compromiso
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setStatusTask(t);
                      setReason('');
                      setError('');
                    }}
                  >
                    {t.done ? 'Reabrir' : 'Marcar atendido'}
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}
      {editing && (
        <CommitmentForm
          key={typeof editing === 'string' ? 'new' : editing.id}
          state={state}
          task={editing === 'new' ? undefined : editing}
          personId={personId}
          onClose={() => setEditing(null)}
          onSave={onSave}
        />
      )}
      {statusTask && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setStatusTask(null);
          }}
        >
          <DialogContent className="work-dialog">
            <DialogHeader>
              <DialogTitle>
                {statusTask.done
                  ? 'Reabrir compromiso'
                  : 'Marcar compromiso atendido'}
              </DialogTitle>
              <DialogDescription>
                No registra dinero ni confirma que la deuda esté pagada.
              </DialogDescription>
            </DialogHeader>
            <form
              className="secure-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                try {
                  await onSave('desk-task', {
                    id: statusTask.id,
                    personId: statusTask.person_id,
                    version: statusTask.version,
                    done: !statusTask.done,
                    reason,
                  });
                  setStatusTask(null);
                } catch (e) {
                  setError(workError(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Resultado del seguimiento
                <textarea
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={1500}
                  placeholder="Ejemplo: pago registrado con recibo…, o se acordó otra fecha"
                />
              </label>
              {error && (
                <p role="alert">
                  {error} Cierra esta ventana y pulsa Actualizar para cargar la
                  versión vigente.
                </p>
              )}
              <button className="primary-button" disabled={busy}>
                {busy ? 'Guardando…' : 'Guardar seguimiento'}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
function CommitmentForm({
  state,
  task,
  personId,
  onClose,
  onSave,
}: {
  state: WorkState;
  task?: WorkTask;
  personId: string;
  onClose: () => void;
  onSave: WorkSave;
}) {
  const [selected, setSelected] = useState(task?.person_id || personId),
    [query, setQuery] = useState(''),
    [account, setAccount] = useState(task?.account_id || ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [dirty, setDirty] = useState(false),
    [requestId] = useState(() => crypto.randomUUID());
  const guard = useUnsavedChanges(dirty, busy);
  const lots = state.lots.filter((l) => l.person_id === selected),
    accounts = state.accounts.filter((a) =>
      lots.some((l) => l.id === a.lot_id),
    );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy && guard.canLeave()) onClose();
      }}
    >
      <DialogContent className="work-dialog">
        <DialogHeader>
          <DialogTitle>
            {task ? 'Modificar compromiso' : 'Nuevo compromiso de pago'}
          </DialogTitle>
          <DialogDescription>
            Guarda lo acordado con la persona. El dinero recibido se registra
            por separado.
          </DialogDescription>
        </DialogHeader>
        <form
          className="secure-form"
          onChange={() => setDirty(true)}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            const values = Object.fromEntries(new FormData(e.currentTarget));
            try {
              await onSave('desk-commitment', {
                ...values,
                personId: selected,
                accountId: account,
                id: task?.id,
                version: task?.version,
                requestId,
              });
              guard.markSaved();
              onClose();
            } catch (e) {
              setError(workError(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {!task && !personId && (
            <label>
              Buscar persona
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre, DNI o lote"
              />
            </label>
          )}
          <label>
            Persona
            <select
              required
              value={selected}
              disabled={!!task || !!personId}
              onChange={(e) => {
                setSelected(e.target.value);
                setAccount('');
              }}
            >
              <option value="">Selecciona una ficha de trabajo</option>
              {state.people
                .filter(
                  (p) =>
                    p.id === selected || matchesPerson(query, p, state.lots),
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.document}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Cuenta del compromiso
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">Sin cuenta específica / por confirmar</option>
              {accounts.map((a) => {
                const lot = lots.find((l) => l.id === a.lot_id);
                return (
                  <option value={a.id} key={a.id}>
                    {lot?.project} · {lot?.name} · {a.concept}
                  </option>
                );
              })}
            </select>
          </label>
          <label>
            Importe prometido (S/)
            <input
              name="amount"
              inputMode="decimal"
              defaultValue={
                task?.amount != null ? (task.amount / 100).toFixed(2) : ''
              }
              required
              placeholder="Ejemplo: 200.00"
            />
          </label>
          <label>
            Fecha acordada
            <input
              name="due"
              type="date"
              defaultValue={task?.due || todayLocal()}
              required
            />
          </label>
          <label>
            Descripción
            <textarea
              name="description"
              defaultValue={task?.description || ''}
              required
              maxLength={3000}
              placeholder="Indica lo acordado y cómo se hará el seguimiento"
            />
          </label>
          <label>
            Motivo del registro o cambio
            <textarea name="reason" required maxLength={1500} />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button" disabled={busy || !selected}>
            {busy ? 'Guardando…' : 'Guardar compromiso'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
