'use client';
import { useState } from 'react';
import type { Dataset } from '@/lib/source-data';
import type { UpdateSummary } from '@/lib/dataset-update';
import { workCall, workError } from './work-shared';

export function DatasetUpdatePanel({
  current,
  onDone,
}: {
  current: Dataset | null;
  onDone: () => Promise<void>;
}) {
  const [bundle, setBundle] = useState<{
    dataset: Dataset;
    originalBase64: string;
  } | null>(null);
  const [summary, setSummary] = useState<UpdateSummary | null>(null);
  const [reason, setReason] = useState(''),
    [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState(false);
  async function review(file: File) {
    setBusy(true);
    setError('');
    setSummary(null);
    setBundle(null);
    setConfirmed(false);
    setDone(false);
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error('El archivo supera 20 MB.');
      const parsed = JSON.parse(await file.text());
      if (
        parsed.format !== 'cartera-update-v1' ||
        typeof parsed.originalBase64 !== 'string' ||
        !parsed.dataset
      )
        throw new Error(
          'Selecciona el paquete de actualización preparado para Cartera.',
        );
      const original = Uint8Array.from(atob(parsed.originalBase64), (c) =>
        c.charCodeAt(0),
      );
      const hash = [
        ...new Uint8Array(await crypto.subtle.digest('SHA-256', original)),
      ]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('');
      if (hash !== parsed.dataset.sourceHash)
        throw new Error(
          'El archivo original no coincide con los datos del paquete.',
        );
      const result = await workCall<UpdateSummary>('dataset-review', {
        dataset: parsed.dataset,
        previousHash: current?.sourceHash,
      });
      setBundle(parsed);
      setSummary(result);
    } catch (e) {
      setError(workError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel secure-content">
      <p className="eyebrow">ADMINISTRACIÓN</p>
      <h1>Actualizar la base</h1>
      <p>
        Revisa los cambios antes de activar una nueva versión. Los archivos
        anteriores, pagos, documentos y fichas se conservan.
      </p>
      <p>
        Base actual: <strong>{current?.sourceName ?? 'No disponible'}</strong>
      </p>
      <label className="field-label">
        Paquete de actualización (.json)
        <input
          type="file"
          accept=".json"
          disabled={busy || !current}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void review(f);
            e.target.value = '';
          }}
        />
      </label>
      {busy && <output>Procesando la actualización…</output>}
      {error && (
        <p className="secure-error" role="alert">
          {error}
        </p>
      )}
      {done && (
        <output>
          La nueva base está activa. Puedes consultarla en Archivo original.
        </output>
      )}
      {summary && bundle && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              const bytes = Uint8Array.from(atob(bundle.originalBase64), (c) =>
                c.charCodeAt(0),
              );
              const response = await fetch('/api/secure/source', {
                method: 'PUT',
                credentials: 'same-origin',
                body: bytes,
              });
              if (!response.ok) {
                const data = (await response.json()) as { error?: string };
                throw new Error(
                  data.error || 'No se pudo guardar el original.',
                );
              }
              await workCall('dataset-update', {
                dataset: bundle.dataset,
                previousHash: summary.previousHash,
                reason,
                confirmed,
              });
              setBundle(null);
              setSummary(null);
              setDone(true);
              await onDone();
            } catch (e) {
              setError(workError(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>{summary.nextName}</h2>
          <dl className="source-fields">
            <div>
              <dt>Pagados totalmente según marca rosa</dt>
              <dd>{summary.paidInFull}</dd>
            </div>
            <div>
              <dt>Filas con mismos valores y vínculo único</dt>
              <dd>{summary.unchanged}</dd>
            </div>
            <div>
              <dt>Filas modificadas con identidad y contrato coincidentes</dt>
              <dd>{summary.changed}</dd>
            </div>
            <div>
              <dt>Registros trasladados entre hojas</dt>
              <dd>{summary.moved}</dd>
            </div>
            <div>
              <dt>Nuevas filas o sin coincidencia segura</dt>
              <dd>{summary.newOrUnmatched}</dd>
            </div>
            <div>
              <dt>Filas anteriores sin correspondencia; quedan archivadas</dt>
              <dd>{summary.archivedUnmatched}</dd>
            </div>
            <div>
              <dt>
                Retirados de Ciudad de Dios / sin lote / denunciantes / no
                cobrar
              </dt>
              <dd>
                {summary.retiredFromCiudad} / {summary.noLot} /{' '}
                {summary.complainants} / {summary.noCollect}
              </dd>
            </div>
          </dl>
          <p>
            Las cifras incluyen encabezados y anotaciones. No se unen personas
            por nombre ni se convierten importes del Excel en saldos
            confirmados. Las coincidencias dudosas requieren revisión manual.
          </p>
          <label className="field-label">
            Motivo de la actualización
            <textarea
              required
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              required
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{' '}
            Revisé el resumen y quiero activar esta versión conservando el
            historial.
          </label>
          <div className="work-actions">
            <button
              className="primary-button"
              disabled={busy || !confirmed || !reason.trim()}
            >
              Confirmar actualización
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
