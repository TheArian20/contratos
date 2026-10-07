'use client';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  editFields,
  editDifferences,
  recordValues,
  validateEdit,
  type EditValues,
} from '@/lib/record-editing';
import type { SourceRecord } from '@/lib/source-data';
import { ColorPicker } from './color-picker';
import { pinkMeansPaid } from '@/lib/record-colors';

export function ChangeSummary({
  before,
  after,
}: {
  before: Partial<EditValues>;
  after: Partial<EditValues>;
}) {
  return (
    <dl className="edit-differences">
      {editDifferences(before, after).map((d) => (
        <div key={d.label}>
          <dt>{d.label}</dt>
          <dd>
            <span>Antes</span>
            {d.before}
          </dd>
          <dd>
            <span>Ahora</span>
            <strong>{d.after}</strong>
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function RecordEditor({
  record,
  project,
  admin,
  onSave,
  onClose,
  onReload,
}: {
  record: SourceRecord;
  project: string;
  admin: boolean;
  onSave: (values: EditValues, note: string, reason: string) => Promise<void>;
  onClose: () => void;
  onReload: () => Promise<void>;
}) {
  const [before] = useState(() => recordValues(record));
  const [values, setValues] = useState(before);
  const [note, setNote] = useState(''),
    [reason, setReason] = useState('');
  const [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const changed = editDifferences(before, values).length > 0 || !!note.trim();
  const pinkDebt = pinkMeansPaid(project);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="work-dialog record-editor">
        <DialogHeader>
          <DialogTitle>
            {review ? 'Revisar cambios' : 'Editar datos'}
          </DialogTitle>
          <DialogDescription>
            {record.person} · {project} · {record.lot || 'Ubicación pendiente'}.
            Los cambios corresponden a este expediente; los demás lotes se
            editan por separado.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div role="alert" className="form-error">
            <p>{error}</p>
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onReload();
                  onClose();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : 'No se pudo recargar.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Descartar este borrador y recargar datos
            </button>
          </div>
        )}
        <form
          className="secure-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            if (!review) {
              try {
                setValues(validateEdit(values, before, admin));
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Revisa los datos.');
                return;
              }
              setReview(true);
              return;
            }
            setBusy(true);
            try {
              await onSave(values, note.trim(), reason.trim());
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo guardar.');
            } finally {
              setBusy(false);
            }
          }}
        >
          {!review ? (
            <>
              <fieldset disabled={busy} className="record-edit-fields">
                <legend>Persona y terreno</legend>
                {editFields.map((f) => (
                  <label key={f.key}>
                    {f.label}
                    <input
                      value={values[f.key]}
                      maxLength={f.max}
                      required={f.key === 'name'}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.key]: e.target.value }))
                      }
                    />
                  </label>
                ))}
              </fieldset>
              <p>
                Si la ubicación viene junta, como B-24AA, consérvala en
                «Ubicación completa». Completa manzana y lote solo cuando estén
                identificados.
              </p>
              <ColorPicker
                value={values.color ?? ''}
                allowPink={!pinkDebt || admin}
                disabled={pinkDebt && before.paidInFull && !admin}
                onChange={(color) =>
                  setValues((v) => ({
                    ...v,
                    color,
                    ...(pinkDebt && admin
                      ? { paidInFull: color === 'pink' }
                      : {}),
                  }))
                }
              />
              <p>
                {pinkDebt
                  ? 'En Ciudad de Dios, el rosado significa sin deuda y lo confirma Administración.'
                  : 'Aquí los colores son etiquetas; no cambian la deuda.'}
              </p>
              {admin ? (
                <label>
                  Estado de deuda
                  <select
                    value={values.paidInFull ? 'paid' : 'review'}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        paidInFull: e.target.value === 'paid',
                        ...(pinkDebt
                          ? {
                              color:
                                e.target.value === 'paid'
                                  ? 'pink'
                                  : v.color === 'pink'
                                    ? ''
                                    : v.color,
                            }
                          : {}),
                      }))
                    }
                  >
                    <option value="review">Por revisar</option>
                    <option value="paid">Sin deuda · rosado</option>
                  </select>
                </label>
              ) : (
                <p>
                  Estado:{' '}
                  <strong>
                    {before.paidInFull ? 'Sin deuda' : 'Por revisar'}
                  </strong>
                  . Administración confirma los cambios de deuda.
                </p>
              )}
              {admin && values.paidInFull !== before.paidInFull && (
                <p>
                  Esta marca conserva el historial de pagos; no registra ni
                  elimina abonos.
                </p>
              )}
              <label>
                Nueva observación
                <textarea
                  value={note}
                  maxLength={1500}
                  rows={3}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Las observaciones anteriores se conservan."
                />
              </label>
              <label>
                Motivo del cambio
                <textarea
                  value={reason}
                  required
                  maxLength={1500}
                  rows={2}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explica por qué corriges estos datos."
                />
              </label>
            </>
          ) : (
            <section aria-label="Resumen de cambios">
              <ChangeSummary before={before} after={values} />
              {note.trim() && (
                <p>
                  <strong>Observación que se añadirá:</strong> {note.trim()}
                </p>
              )}
              <p>
                <strong>Motivo:</strong> {reason}
              </p>
              <p>
                El cambio quedará registrado con tu cuenta y la fecha de
                guardado.
              </p>
            </section>
          )}
          <div className="work-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => (review ? setReview(false) : onClose())}
            >
              {review ? 'Volver a editar' : 'Cancelar'}
            </button>
            <button
              className="primary-button"
              disabled={busy || !changed || !reason.trim()}
            >
              {busy
                ? 'Guardando…'
                : review
                  ? 'Confirmar y guardar'
                  : 'Revisar cambios'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
