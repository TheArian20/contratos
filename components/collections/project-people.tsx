'use client';
import { useEffect, useState } from 'react';
import { workCall, workError } from './work-shared';
import { clean } from '@/lib/source-data';
export function ProjectPeople({
  project,
  query,
  onOpen,
}: {
  project?: string;
  query: string;
  onOpen: (id: string) => void;
}) {
  const [rows, setRows] = useState<
    Array<{ id: string; name: string; document: string; project: string }>
  >([]);
  const [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void workCall<typeof rows>('desk-project-people')
      .then((r) => {
        if (active) setRows(r);
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
  }, [retry]);
  const matches = rows.filter(
    (r) =>
      (!project || r.project === project) &&
      clean(`${r.name} ${r.document} ${r.project}`).includes(clean(query)),
  );
  if (error)
    return (
      <p role="alert">
        No se pudieron cargar las personas añadidas.{' '}
        <button
          className="secondary-button"
          onClick={() => {
            setLoading(true);
            setError('');
            setRetry((n) => n + 1);
          }}
        >
          Reintentar
        </button>
      </p>
    );
  if (loading) return <p>Cargando personas añadidas al proyecto…</p>;
  if (!matches.length) return null;
  return (
    <section className="project-people">
      <h3>Personas añadidas desde la página ({matches.length})</h3>
      <p>
        {project
          ? `Registradas en ${project}.`
          : 'Organizadas por su proyecto de destino.'}
      </p>
      {matches.map((r) => (
        <div key={`${r.id}:${r.project}`} className="agenda-work-row">
          <div>
            <strong>{r.name}</strong>
            <p>
              {r.document || 'Identificación pendiente'} · {r.project}
            </p>
          </div>
          <button className="secondary-button" onClick={() => onOpen(r.id)}>
            Abrir ficha
          </button>
        </div>
      ))}
    </section>
  );
}
