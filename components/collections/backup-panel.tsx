'use client';
import { useEffect, useState } from 'react';
import { workCall, workError } from './work-shared';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import type { SavedBackup, BackupSchedule } from '@/lib/backup-storage';
import { verifyBackup, type BackupManifest } from '@/lib/backup-format';
export function BackupPanel() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [status, setStatus] = useState(''),
    [manifest, setManifest] = useState<BackupManifest | null>(null);
  const [info, setInfo] = useState<{
    runs: Omit<SavedBackup, 'key'>[];
    schedule: BackupSchedule | null;
  }>({ runs: [], schedule: null });
  const [manualId, setManualId] = useState(
    () => 'manual-' + crypto.randomUUID(),
  );
  const [loading, setLoading] = useState(true);
  useUnsavedChanges(false, busy);
  const refresh = async () => {
    setInfo(await workCall<typeof info>('backup-info'));
  };
  useEffect(() => {
    let active = true;
    void workCall<typeof info>('backup-info')
      .then((result) => {
        if (active) setInfo(result);
      })
      .catch((e) => {
        if (active) setError(workError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const latest = info.runs.find((run) => run.status === 'complete');
  return (
    <section className="panel secure-content backup-panel">
      <p className="eyebrow">SOLO ADMINISTRACIÓN</p>
      <h1>Respaldos y recuperación</h1>
      <section className="backup-status">
        <h2>Estado de protección</h2>
        <p>
          {loading
            ? 'Consultando copias…'
            : latest
              ? `Última copia completa: ${new Date(latest.finished ?? latest.started).toLocaleString('es-PE')}`
              : 'Todavía no hay una copia privada completa guardada.'}
        </p>
        {!loading &&
          (!latest ||
            Date.now() - Date.parse(latest.finished ?? latest.started) >
              48 * 60 * 60 * 1000) && (
            <p className="source-pending">
              Conviene crear una copia ahora: no hay una copia completa de las
              últimas 48 horas.
            </p>
          )}
        <p>
          {info.schedule?.enabled
            ? `Programación registrada: todos los días a las ${info.schedule.time} (${info.schedule.timezone}). Revisa abajo el resultado de cada ejecución.`
            : 'Programación automática pendiente de activar. Puedes guardar una copia manual ahora.'}
        </p>
        <div className="work-actions">
          <button
            className="primary-button"
            disabled={busy || loading}
            onClick={async () => {
              setBusy(true);
              setError('');
              setStatus('Guardando y verificando la copia privada…');
              try {
                await workCall('backup-create', { requestId: manualId });
                setManualId('manual-' + crypto.randomUUID());
                await refresh();
                setStatus(
                  'Copia completa guardada y comprobada. Ya puedes descargarla.',
                );
              } catch (e) {
                setStatus('');
                setError(workError(e));
                await refresh().catch(() => {});
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Procesando…' : 'Guardar copia privada ahora'}
          </button>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() =>
              void refresh()
                .then(() => setError(''))
                .catch((e) => setError(workError(e)))
            }
          >
            Actualizar estado
          </button>
        </div>
        <p>
          Las copias privadas se guardan en el alojamiento de Cartera. Conserva
          también una descarga fuera del sitio para poder recuperarte si pierdes
          acceso al alojamiento.
        </p>
      </section>
      <h2>Copias guardadas</h2>
      <p>
        Se muestran las últimas 60 ejecuciones. Solo Administración puede
        descargar sus archivos.
      </p>
      {info.runs.map((run) => (
        <div className="agenda-work-row" key={run.id}>
          <div>
            <strong>
              {run.mode === 'daily' ? 'Copia diaria' : 'Copia manual'} ·{' '}
              {new Date(run.started).toLocaleString('es-PE')}
            </strong>
            <p>
              {run.status === 'complete'
                ? 'Completa y comprobada'
                : run.status === 'failed'
                  ? 'No se completó'
                  : 'En preparación; actualiza para comprobar el resultado'}
              {run.size ? ` · ${(run.size / 1024 / 1024).toFixed(1)} MB` : ''}
            </p>
            {run.error && <small>{run.error}</small>}
          </div>
          {run.status === 'complete' && (
            <a
              className="secondary-button"
              href={`/api/secure/backup-saved?id=${encodeURIComponent(run.id)}`}
            >
              Descargar copia
            </a>
          )}
        </div>
      ))}
      <h2>Descargar una copia actual</h2>
      <p>
        Descarga una copia de las personas, lotes, pagos, observaciones,
        usuarios, historial, versiones del Excel y documentos adjuntos.
      </p>
      <p className="report-note">
        Contiene datos personales y hashes de contraseñas. Guárdala en una
        carpeta privada, nunca en el repositorio público. No incluye sesiones
        abiertas ni el token de configuración del servidor.
      </p>
      <button
        className="primary-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          setManifest(null);
          setStatus('Preparando y comprobando el respaldo…');
          try {
            const r = await fetch('/api/secure/backup', {
              credentials: 'same-origin',
            });
            if (!r.ok) {
              const e = (await r.json()) as { error?: string };
              throw new Error(e.error || 'No se pudo crear el respaldo.');
            }
            const blob = await r.blob();
            const m = await verifyBackup(blob);
            setManifest(m);
            const url = URL.createObjectURL(blob),
              a = document.createElement('a');
            a.href = url;
            a.download = `cartera-respaldo-${m.created.slice(0, 10)}.tar`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            setStatus(
              'Respaldo verificado. Descarga enviada al navegador; comprueba que el archivo se guardó.',
            );
          } catch (e) {
            setStatus('');
            setError(
              e instanceof Error
                ? e.message
                : 'No se pudo completar el respaldo.',
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Procesando…' : 'Descargar respaldo completo'}
      </button>
      <h2>Comprobar una copia guardada</h2>
      <p>
        Selecciona tu archivo .tar. La comprobación se realiza en este
        navegador; no sube ni restaura datos.
      </p>
      <label>
        Archivo de respaldo
        <input
          type="file"
          accept=".tar"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError('');
            setManifest(null);
            setStatus('Verificando integridad…');
            try {
              if (file.size > 512 * 1024 * 1024)
                throw new Error(
                  'Máximo 512 MB para la verificación en navegador.',
                );
              const m = await verifyBackup(file);
              setManifest(m);
              setStatus(
                'Integridad comprobada: todos los archivos coinciden con el manifiesto.',
              );
            } catch (e) {
              setStatus('');
              setError(e instanceof Error ? e.message : 'Copia inválida.');
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {status && (
        <p role="status" className="notice">
          {status}
        </p>
      )}
      {manifest && (
        <div className="report-metrics">
          <div>
            <span>Fecha de la copia</span>
            <strong>
              {new Date(manifest.created).toLocaleDateString('es-PE')}
            </strong>
          </div>
          <div>
            <span>Archivos comprobados</span>
            <strong>{manifest.files.length}</strong>
          </div>
          <div>
            <span>Personas / pagos</span>
            <strong>
              {manifest.counts.people} / {manifest.counts.payments}
            </strong>
          </div>
        </div>
      )}
      <h2>Cómo recuperar la información</h2>
      <ol>
        <li>Conserva la copia original y comprueba su integridad.</li>
        <li>
          El procedimiento del repositorio restaura la copia en una carpeta
          nueva, con una base SQLite y los archivos. Se prueba allí antes de
          tocar la web.
        </li>
        <li>
          La recuperación del sitio requiere al responsable técnico y acceso al
          alojamiento. Esta pantalla no sobrescribe la base de producción.
        </li>
      </ol>
      <p>
        El repositorio incluye <code>docs/RESPALDOS.md</code> y{' '}
        <code>scripts/restore_backup.py</code>. Descarga una copia antes de
        importar otra base y después de jornadas con cambios importantes. Los
        respaldos guardados se muestran arriba; la programación solo figura
        activa después de configurarse en Sites.
      </p>
    </section>
  );
}
