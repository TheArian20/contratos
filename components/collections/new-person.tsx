'use client';
import { useState } from 'react';
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
  ['project', 'Proyecto del primer lote (opcional)', 120],
  ['lot', 'Ubicación del primer lote (opcional)', 120],
  ['contract', 'Número de contrato (opcional)', 150],
] as const;
export function NewPerson({
  onClose,
  onSave,
  onDone,
  busy,
}: {
  onClose: () => void;
  onSave: WorkSave;
  onDone: (id: string) => void;
  busy: boolean;
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
    [reason, setReason] = useState('Registro de nueva persona'),
    [review, setReview] = useState(false),
    [error, setError] = useState('');
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent className="work-dialog">
        <DialogHeader>
          <DialogTitle>
            {review ? 'Revisar nueva persona' : 'Nueva persona'}
          </DialogTitle>
          <DialogDescription>
            Crea su ficha sin necesitar un Excel. Podrás añadir documentos y más
            lotes desde la ficha.
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
            if (!review) {
              setReview(true);
              return;
            }
            try {
              const result = await onSave('desk-person-new', {
                ...data,
                requestId,
                color,
                reason,
              });
              if (result.id) {
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
                    <input
                      value={data[key]}
                      maxLength={max}
                      required={
                        key === 'name' ||
                        (key === 'project' && !!data.lot) ||
                        (key === 'lot' && !!data.project)
                      }
                      onChange={(e) =>
                        setData((v) => ({ ...v, [key]: e.target.value }))
                      }
                    />
                  </label>
                ))}
              </div>
              <ColorPicker value={color} onChange={setColor} />
              <p>
                El color es una etiqueta de esta ficha. Los saldos se
                confirmarán por lote y concepto.
              </p>
              <label>
                Motivo / observación inicial
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
              onClick={() => (review ? setReview(false) : onClose())}
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
