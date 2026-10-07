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
import type { Person } from '@/lib/work-ledger';
import { workCall, workError } from './work-shared';
export function PersonColorEditor({
  person,
  onClose,
  onSaved,
}: {
  person: Person;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [color, setColor] = useState(person.color ?? ''),
    [reason, setReason] = useState(''),
    [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
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
          <DialogTitle>Cambiar color</DialogTitle>
          <DialogDescription>
            {person.name}. Esta etiqueta no cambia los saldos de sus lotes.
          </DialogDescription>
        </DialogHeader>
        {error && <p role="alert">{error}</p>}
        <form
          className="secure-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!review) {
              setReview(true);
              return;
            }
            setBusy(true);
            setError('');
            try {
              await workCall('desk-person-color', {
                id: person.id,
                version: person.version,
                color,
                reason,
              });
              await onSaved();
              onClose();
            } catch (e) {
              setError(workError(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {review ? (
            <section>
              <p>Antes: {colorLabel(person.color)}</p>
              <p>Ahora: {colorLabel(color)}</p>
              <p>Motivo: {reason}</p>
            </section>
          ) : (
            <>
              <ColorPicker value={color} onChange={setColor} />
              <label>
                Motivo del cambio
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  maxLength={1500}
                />
              </label>
            </>
          )}
          <div className="work-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => (review ? setReview(false) : onClose())}
            >
              {review ? 'Volver' : 'Cancelar'}
            </button>
            <button
              className="primary-button"
              disabled={
                busy || color === (person.color ?? '') || !reason.trim()
              }
            >
              {busy
                ? 'Guardando…'
                : review
                  ? 'Confirmar y guardar'
                  : 'Revisar cambio'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
