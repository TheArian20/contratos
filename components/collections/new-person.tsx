'use client';
import { useState } from 'react';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { sameDocument } from '@/lib/person-search';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ColorPicker } from './color-picker';
import { colorLabel } from '@/lib/record-colors';
import type { WorkSave } from './work-shared';
const fields = [
  ['name', 'Nombre completo', 150],
  ['document', 'DNI / identificación', 40],
  ['phone', 'Teléfono', 80],
  ['address', 'Dirección', 300],
  ['project', 'Proyecto donde se registrará', 120],
  ['lot', 'Ubicación del primer lote (opcional)', 120],
  ['contract', 'Número de contrato (opcional)', 150],
] as const;
export function NewPerson({
  onClose,
  onSave,
  onDone,
  busy,
  projects,
  existing = [],
}: {
  onClose: () => void;
  onSave: WorkSave;
  onDone: (id: string) => void;
  busy: boolean;
  projects: string[];
  existing?: { name: string; document: string }[];
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [data, setData] = useState({
    name: '',
    document: '',
    phone: '',
    address: '',
    project: '',
    lot: '',
    contract: '',
  });
  const [color, setColor] = useState(''),
    [observation, setObservation] = useState(''),
    [reason, setReason] = useState('Registro de nueva persona'),
    [review, setReview] = useState(false),
    [error, setError] = useState('');
  const guard = useUnsavedChanges(
    Object.values(data).some(Boolean) ||
      !!color ||
      !!observation ||
      reason !== 'Registro de nueva persona',
    busy,
  );
  const close = () => {
    if (guard.canLeave()) onClose();
  };
  const duplicates = data.document.trim()
    ? existing.filter((p) => sameDocument(p.document, data.document))
    : [];
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) close();
      }}
    >
      <DialogContent className="work-dialog">
        <DialogHeader>
          <DialogTitle>
            {review ? 'Revisar nueva persona' : 'Nueva persona'}
          </DialogTitle>
          <DialogDescription>
            Solo el nombre y el proyecto son obligatorios. Los demás datos se
            pueden completar después.
          </DialogDescription>
        </DialogHeader>
        {error && <p role="alert">{error}</p>}
        <form
          className="secure-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            if (!data.name.trim()) {
              setError('Escribe el nombre.');
              return;
            }
            if (!projects.includes(data.project)) {
              setError(
                'Selecciona el proyecto donde se registrará la persona.',
              );
              return;
            }
            if (!review) {
              if (duplicates.length) {
                setError(
                  'Ese DNI ya tiene un registro. Busca a la persona antes de crear otra ficha.',
                );
                return;
              }
              if (data.contract.trim() && !data.lot.trim()) {
                setError(
                  'Completa la ubicación del lote al que pertenece el contrato.',
                );
                return;
              }
              setReview(true);
              return;
            }
            try {
              const result = await onSave('desk-person-new', {
                ...data,
                requestId,
                color,
                reason,
                observation: observation.trim(),
              });
              if (result.id) {
                guard.markSaved();
                onDone(result.id);
                onClose();
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo guardar.');
            }
          }}
        >
          {!review ? (
            <>
              <div className="record-edit-fields">
                {fields.map(([key, label, max]) => (
                  <label key={key}>
                    {label}
                    {key === 'project' ? (
                      <select
                        required
                        value={data.project}
                        onChange={(e) =>
                          setData((v) => ({ ...v, project: e.target.value }))
                        }
                      >
                        <option value="">Selecciona un proyecto</option>
                        {projects.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={data[key]}
                        maxLength={max}
                        required={key === 'name'}
                        onChange={(e) =>
                          setData((v) => ({ ...v, [key]: e.target.value }))
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
              {duplicates.length > 0 && (
                <p className="form-error" role="alert">
                  Ese DNI ya aparece en:{' '}
                  {duplicates
                    .slice(0, 3)
                    .map((p) => p.name)
                    .join(' · ')}
                  . Cancela y búscalo para evitar duplicados.
                </p>
              )}
              <label>
                Observación inicial (opcional)
                <textarea
                  rows={3}
                  maxLength={1500}
                  value={observation}
                  placeholder="Por ejemplo: realizar nuevo contrato o llamar para completar sus datos."
                  onChange={(e) => setObservation(e.target.value)}
                />
                <small>
                  Se guardará en Observaciones de su ficha. {observation.length}
                  /1500
                </small>
              </label>
              <p>
                {data.project
                  ? `La persona aparecerá en ${data.project}. Puedes completar su lote más adelante.`
                  : 'Elige un proyecto. No necesitas conocer todavía la ubicación del lote.'}
              </p>
              <ColorPicker value={color} onChange={setColor} />
              <p>
                El color es una etiqueta de esta ficha. Los saldos se
                confirmarán por lote y concepto.
              </p>
              <label>
                Motivo del registro
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  maxLength={1500}
                />
              </label>
            </>
          ) : (
            <section>
              <dl className="source-fields">
                {fields
                  .filter(([key]) => data[key])
                  .map(([key, label]) => (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd>{data[key]}</dd>
                    </div>
                  ))}
              </dl>
              <p>Color: {colorLabel(color)}</p>
              {observation.trim() && (
                <p className="observation-text">
                  <strong>Observación inicial:</strong> {observation}
                </p>
              )}
              <p>{reason}</p>
              <p>
                La ficha quedará registrada con tu cuenta. No se crearán
                importes ni pagos automáticamente.
              </p>
            </section>
          )}
          <div className="work-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => (review ? setReview(false) : close())}
            >
              {review ? 'Volver a editar' : 'Cancelar'}
            </button>
            <button
              className="primary-button"
              disabled={busy || !reason.trim()}
            >
              {busy
                ? 'Guardando…'
                : review
                  ? 'Confirmar y crear persona'
                  : 'Revisar datos'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
