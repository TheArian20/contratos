'use client';
import { useMemo, useState } from 'react';
import { duplicateGroups, type DuplicateRecord } from '@/lib/daily-operations';
import { matchesSearch } from '@/lib/person-search';
export function DuplicatePanel({
  records,
  onOpen,
}: {
  records: DuplicateRecord[];
  onOpen: (record: DuplicateRecord) => void;
}) {
  const [query, setQuery] = useState(''),
    [kind, setKind] = useState('Todos'),
    [page, setPage] = useState(0);
  const groups = useMemo(() => duplicateGroups(records), [records]);
  const filtered = groups.filter(
    (g) =>
      (kind === 'Todos' || g.kind === kind) &&
      matchesSearch(query, [
        g.label,
        ...g.records.flatMap((r) => [r.name, r.document, r.project, r.lot]),
      ]),
  );
  return (
    <section className="panel secure-content">
      <h2>Posibles duplicados</h2>
      <p>
        Compara el DNI, proyecto y lote. Un traslado, una pareja o un registro
        histórico puede explicar la coincidencia. No se unen ni se eliminan
        fichas automáticamente.
      </p>
      <div className="secure-filters">
        <label>
          Buscar coincidencia
          <input
            value={query}
            placeholder="Nombre, DNI o lote"
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label>
          Coincidencia
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(0);
            }}
          >
            <option>Todos</option>
            <option>DNI</option>
            <option>Lote</option>
          </select>
        </label>
      </div>
      <p role="status">{filtered.length} grupos para revisar</p>
      {filtered.slice(page * 15, page * 15 + 15).map((g) => (
        <section className="source-group" key={g.key}>
          <h3>
            {g.kind}: {g.label}
          </h3>
          {g.records.map((r) => (
            <div className="agenda-work-row" key={r.id}>
              <div>
                <strong>{r.name}</strong>
                <p>
                  DNI: {r.document || 'Pendiente'} · {r.project} ·{' '}
                  {r.lot || 'Sin lote indicado'}
                </p>
              </div>
              <button className="secondary-button" onClick={() => onOpen(r)}>
                Revisar ficha
              </button>
            </div>
          ))}
        </section>
      ))}
      {!filtered.length && (
        <p>No se encontraron coincidencias con estos filtros.</p>
      )}
      {filtered.length > 15 && (
        <div className="secure-pagination">
          <button
            className="secondary-button"
            disabled={!page}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </button>
          <span>
            Página {page + 1} de {Math.ceil(filtered.length / 15)}
          </span>
          <button
            className="secondary-button"
            disabled={(page + 1) * 15 >= filtered.length}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </section>
  );
}
