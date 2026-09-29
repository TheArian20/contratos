'use client';
import { WorkSelect } from './work-select';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { concepts } from '@/lib/concept-payments';
import { clean } from '@/lib/source-data';
import { soles, type WorkState } from '@/lib/work-ledger';
import {
  workError,
  type WorkModal,
  type Candidate,
  type WorkSave,
} from './work-shared';
export function WorkForm({
  modal,
  state,
  candidates,
  busy,
  onClose,
  onSource,
  onSave,
  onPerson,
}: {
  modal: WorkModal;
  state: WorkState;
  candidates: Candidate[];
  busy: boolean;
  onClose: () => void;
  onSource: (s: number, r: number) => void;
  onSave: WorkSave;
  onPerson: (id: string) => void;
}) {
  const [error, setError] = useState('');
  const lots = state.lots.filter((l) => l.person_id === modal.person?.id),
    accounts = state.accounts.filter((a) =>
      lots.some((l) => l.id === a.lot_id),
    );
  const field = (
    label: string,
    name: string,
    value: string | number = '',
    required = false,
    type = 'text',
  ) => (
    <label>
      {label}
      <input
        name={name}
        defaultValue={value}
        required={required}
        type={type}
        maxLength={type === 'text' ? 300 : undefined}
      />
    </label>
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="work-dialog">
        <DialogHeader>
          <DialogTitle>
            {
              {
                confirm: 'Confirmar identidad y registros',
                'person-edit': 'Corregir datos de persona',
                due: 'Corregir vencimiento',
                lot: modal.lot ? 'Corregir lote' : 'Confirmar un lote',
                account: modal.account
                  ? 'Corregir cuenta'
                  : 'Agregar concepto al lote',
                plan: 'Programar cuotas mensuales',
                void: 'Anular pago sin borrarlo',
                assign: 'Vincular un abono anterior',
                task: 'Anotar gestión o compromiso',
                'task-status': modal.task?.done
                  ? 'Reabrir gestión'
                  : 'Completar gestión',
                unlink: 'Retirar vínculo equivocado',
              }[modal.kind]
            }
          </DialogTitle>
          <DialogDescription>
            Guarda solo datos revisados. El motivo y el autor quedan en el
            historial.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {modal.kind === 'confirm' ? (
          <ConfirmPerson
            candidate={modal.candidate!}
            candidates={candidates}
            state={state}
            busy={busy}
            onSource={onSource}
            onSave={async (path, payload) => {
              const result = await onSave(path, payload);
              onClose();
              onPerson(result.id ?? (payload as { personId: string }).personId);
            }}
          />
        ) : (
          <form
            className="secure-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              const f = Object.fromEntries(new FormData(e.currentTarget));
              let path = '',
                payload: Record<string, unknown> = { ...f };
              if (modal.kind === 'person-edit') {
                path = 'desk-person';
                payload = {
                  ...f,
                  id: modal.person!.id,
                  version: modal.person!.version,
                };
              }
              if (modal.kind === 'lot') {
                path = 'desk-lot';
                payload = {
                  ...f,
                  personId: modal.person!.id,
                  id: modal.lot?.id,
                  version: modal.lot?.version,
                };
              }
              if (modal.kind === 'account') {
                path = 'desk-account';
                payload = {
                  ...f,
                  lotId: modal.lot!.id,
                  id: modal.account?.id,
                  version: modal.account?.version,
                  concept: modal.account?.concept ?? f.concept,
                  openingConfirmed: f.openingConfirmed === 'on',
                };
              }
              if (modal.kind === 'plan') {
                path = 'desk-plan';
                payload = {
                  ...f,
                  accountId: modal.account!.id,
                  version: modal.account!.version,
                };
              }
              if (modal.kind === 'due') {
                path = 'desk-due';
                payload = {
                  ...f,
                  installmentId: modal.installment!.id,
                  version: modal.account!.version,
                };
              }
              if (modal.kind === 'void') {
                path = 'desk-void';
                payload = { ...f, paymentId: modal.payment!.id };
              }
              if (modal.kind === 'assign') {
                path = 'desk-assign';
                const a = state.accounts.find((a) => a.id === f.accountId);
                payload = {
                  ...f,
                  paymentId: modal.payment!.id,
                  version: a?.version,
                };
              }
              if (modal.kind === 'task') {
                path = 'desk-task';
                payload = { ...f, personId: modal.person!.id };
              }
              if (modal.kind === 'task-status') {
                path = 'desk-task';
                payload = {
                  ...f,
                  id: modal.task!.id,
                  personId: modal.person!.id,
                  version: modal.task!.version,
                  done: !modal.task!.done,
                };
              }
              if (modal.kind === 'unlink') {
                path = 'desk-unlink';
                payload = {
                  ...f,
                  personId: modal.person!.id,
                  recordId: modal.recordId,
                };
              }
              try {
                await onSave(path, payload);
                onClose();
              } catch (err) {
                setError(workError(err));
              }
            }}
          >
            {modal.kind === 'person-edit' && (
              <>
                {field('Nombre completo', 'name', modal.person!.name, true)}
                {field(
                  'Identificación · por confirmar si está vacío',
                  'document',
                  modal.person!.document,
                )}
                {field('Teléfono', 'phone', modal.person!.phone)}
                {field('Dirección', 'address', modal.person!.address)}
              </>
            )}
            {modal.kind === 'lot' && (
              <>
                {field(
                  'Identificación de un solo lote',
                  'name',
                  modal.lot?.name ?? '',
                  true,
                )}
                {field('Proyecto', 'project', modal.lot?.project ?? '', true)}
                {field(
                  'Número de contrato',
                  'contract',
                  modal.lot?.contract ?? '',
                )}
              </>
            )}
            {modal.kind === 'account' && (
              <>
                <p>
                  {modal.lot!.project} · {modal.lot!.name}
                </p>
                {modal.account ? (
                  <strong>{modal.account.concept}</strong>
                ) : (
                  <label htmlFor="work-form-1">
                    Concepto
                    <WorkSelect id="work-form-1" name="concept">
                      {concepts.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </WorkSelect>
                  </label>
                )}
                {field(
                  'Monto acordado en S/ · vacío = por confirmar',
                  'agreed',
                  modal.account?.agreed == null
                    ? ''
                    : (modal.account.agreed / 100).toFixed(2),
                )}
                {field(
                  'Pagado histórico verificado en S/ · no incluye abonos del sistema',
                  'opening',
                  ((modal.account?.opening ?? 0) / 100).toFixed(2),
                  true,
                )}
                <label className="confirm-checkbox">
                  <input
                    name="openingConfirmed"
                    type="checkbox"
                    defaultChecked={!!modal.account?.opening_confirmed}
                  />{' '}
                  Revisé el histórico pagado, incluso si es cero. Sin confirmar,
                  el saldo queda pendiente.
                </label>
                {field(
                  'Corte del histórico · hasta el cierre de ese día',
                  'openingDate',
                  modal.account?.opening_date ?? '',
                  false,
                  'date',
                )}
                <p>
                  La fecha de corte debe ser anterior a hoy si hay pagos
                  históricos. Los nuevos pagos deben ser posteriores al corte.
                </p>
              </>
            )}
            {modal.kind === 'plan' && (
              <>
                <p>
                  {modal.lot!.name} · {modal.account!.concept}. El saldo
                  confirmado se divide en cuotas mensuales; el último día del
                  mes se ajusta cuando sea necesario.
                </p>
                {field(
                  'Cantidad de cuotas (1 a 120)',
                  'count',
                  '',
                  true,
                  'number',
                )}
                {field('Primer vencimiento', 'firstDate', '', true, 'date')}
                <p>
                  No se generan cuotas para un saldo desconocido. Se conserva el
                  total exacto en céntimos.
                </p>
              </>
            )}
            {modal.kind === 'due' &&
              field(
                'Nuevo vencimiento',
                'due',
                modal.installment!.due,
                true,
                'date',
              )}
            {modal.kind === 'void' && (
              <p>
                Se anulará {soles(modal.payment!.cents)} de{' '}
                {modal.payment!.concept}, recibo {modal.payment!.reference}. El
                pago quedará visible como anulado y su cuenta se actualizará.
              </p>
            )}
            {modal.kind === 'assign' && (
              <>
                <p>
                  Abono de {soles(modal.payment!.cents)} ·{' '}
                  {modal.payment!.concept} · {modal.payment!.lot}. Confirma el
                  lote de destino; no debe estar incluido en el histórico.
                </p>
                <label htmlFor="work-form-2">
                  Cuenta de destino
                  <WorkSelect id="work-form-2" name="accountId" required>
                    <option value="">Selecciona una cuenta</option>
                    {accounts
                      .filter((a) => a.concept === modal.payment!.concept)
                      .map((a) => (
                        <option value={a.id} key={a.id}>
                          {lots.find((l) => l.id === a.lot_id)?.name} ·{' '}
                          {a.concept}
                        </option>
                      ))}
                  </WorkSelect>
                </label>
              </>
            )}
            {modal.kind === 'task' && (
              <>
                <label htmlFor="work-form-3">
                  Tipo
                  <WorkSelect id="work-form-3" name="kind">
                    <option>Gestión pendiente</option>
                    <option>Compromiso de pago</option>
                  </WorkSelect>
                </label>
                {field('Descripción', 'description', '', true)}
                {field(
                  'Fecha de seguimiento o compromiso',
                  'due',
                  '',
                  true,
                  'date',
                )}
                {field(
                  'Importe comprometido en S/ · solo si es compromiso',
                  'amount',
                )}
              </>
            )}
            {modal.kind === 'task-status' && (
              <p>
                {modal.task!.description}. Completar una gestión no registra un
                pago; usa «Registrar pago» si recibiste dinero.
              </p>
            )}
            {modal.kind === 'unlink' && (
              <p>
                Se retirará esta referencia de la persona. El origen no se
                elimina. Debe quedar al menos un registro vinculado y no puede
                respaldar pagos ya vinculados.
              </p>
            )}
            <label>
              Motivo / comprobación realizada
              <textarea
                name="reason"
                required
                minLength={3}
                maxLength={1500}
                rows={3}
              />
            </label>
            <button className="primary-button" disabled={busy}>
              {busy
                ? 'Guardando…'
                : modal.kind === 'void'
                  ? 'Confirmar anulación'
                  : 'Guardar cambios'}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
function ConfirmPerson({
  candidate,
  candidates,
  state,
  busy,
  onSource,
  onSave,
}: {
  candidate: Candidate;
  candidates: Candidate[];
  state: WorkState;
  busy: boolean;
  onSource: (s: number, r: number) => void;
  onSave: (p: string, d: unknown) => Promise<void>;
}) {
  const [selected, setSelected] = useState([candidate.id]),
    [destination, setDestination] = useState(''),
    [localError, setLocalError] = useState('');
  const similar = candidates.filter(
    (c) =>
      c.id === candidate.id ||
      (candidate.document && clean(c.document) === clean(candidate.document)),
  );
  return (
    <form
      className="secure-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setLocalError('');
        const f = Object.fromEntries(new FormData(e.currentTarget));
        try {
          await onSave(destination ? 'desk-link' : 'desk-person', {
            ...f,
            personId: destination,
            records: selected,
            confirmed: f.confirmed === 'on',
          });
        } catch (err) {
          setLocalError(workError(err));
        }
      }}
    >
      <p>
        Revisa cada registro antes de incluirlo. Las coincidencias se sugieren
        por identificación exacta, sin agruparlas automáticamente.
      </p>
      {similar.map((c) => (
        <div className="verify-candidate" key={c.id}>
          <label aria-label="Seleccionar registro de origen">
            <input
              type="checkbox"
              checked={selected.includes(c.id)}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, c.id]
                    : selected.filter((id) => id !== c.id),
                )
              }
            />
            <span>
              <strong>{c.name}</strong>
              <small>
                {c.document || 'Sin identificación'} · {c.project}
                <br />
                {c.contract} · {c.lot}
              </small>
            </span>
          </label>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onSource(c.sheet, c.row)}
          >
            Ver origen
          </button>
        </div>
      ))}
      <label htmlFor="work-form-4">
        Destino
        <WorkSelect
          id="work-form-4"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        >
          <option value="">Crear ficha de persona</option>
          {state.people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.document || 'Sin identificación'}
            </option>
          ))}
        </WorkSelect>
      </label>
      {!destination && (
        <>
          <label>
            Nombre confirmado
            <input
              name="name"
              defaultValue={candidate.name}
              required
              maxLength={150}
            />
          </label>
          <label>
            DNI / identificación confirmada
            <input
              name="document"
              defaultValue={candidate.document}
              maxLength={40}
            />
          </label>
          <label>
            Teléfono
            <input name="phone" maxLength={80} />
          </label>
          <label>
            Dirección
            <input name="address" maxLength={300} />
          </label>
        </>
      )}
      <label>
        Comprobación realizada
        <textarea
          name="reason"
          placeholder="Documento o contrato que revisaste para confirmar la identidad"
          required
          minLength={3}
          maxLength={1500}
        />
      </label>
      <label className="confirm-checkbox">
        <input name="confirmed" type="checkbox" required /> Confirmé que todos
        los registros seleccionados corresponden a esta persona.
      </label>
      {localError && <p role="alert">{localError}</p>}
      <button className="primary-button" disabled={busy || !selected.length}>
        Confirmar ficha y registros
      </button>
    </form>
  );
}
