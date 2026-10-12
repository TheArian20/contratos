'use client';
import { matchesPerson, matchesSearch } from '@/lib/person-search';
import type { WorkState } from '@/lib/work-ledger';
import type { Candidate } from './work-shared';
import { useState } from 'react';

export function PersonSearch({
  state,
  candidates,
  query,
  onPerson,
  onSource,
}: {
  state: WorkState;
  candidates: Candidate[];
  query: string;
  onPerson: (id: string) => void;
  onSource: (sheet: number, row: number) => void;
}) {
  const [page, setPage] = useState(0);
  const matching = candidates.filter((c) =>
    matchesSearch(query, [c.name, c.document, c.contract, c.lot, c.project]),
  );
  const linked = new Map(
    state.sources
      .filter((s) => state.people.some((p) => p.id === s.person_id))
      .map((s) => [s.record_id, s.person_id]),
  );
  const matches = new Set(
    matching.map((c) => linked.get(c.id)).filter(Boolean),
  );
  const rows = [
    ...state.people
      .filter((p) => matches.has(p.id) || matchesPerson(query, p, state.lots))
      .map((p) => ({
        key: p.id,
        name: p.name,
        document: p.document,
        location: [
          ...new Set(
            [
              p.project,
              ...state.lots
                .filter((l) => l.person_id === p.id)
                .map(
                  (l) =>
                    `${l.project} · ${l.name} · ${l.contract || 'Contrato por confirmar'}`,
                ),
            ].filter(Boolean),
          ),
        ].join(' / '),
        kind: 'Ficha de trabajo',
        open: () => onPerson(p.id),
      })),
    ...matching
      .filter((c) => !linked.has(c.id))
      .map((c) => ({
        key: c.id,
        name: c.name,
        document: c.document,
        location: `${c.project} · ${c.lot || 'Lote por confirmar'} · ${c.contract || 'Contrato por confirmar'}`,
        kind: 'Expediente del Excel',
        open: () => onSource(c.sheet, c.row),
      })),
  ];
  return (
    <section className="panel secure-content">
      <h2>Resultados de la búsqueda</h2>
      <p role="status">
        {rows.length} coincidencias en fichas de trabajo y expedientes del
        Excel.
      </p>
      {!rows.length && (
        <p>
          No encontramos coincidencias. Prueba con parte del nombre, DNI,
          contrato o ubicación del lote.
        </p>
      )}
      {rows.slice(page * 25, page * 25 + 25).map((r) => (
        <article key={r.key} className="agenda-work-row">
          <div>
            <strong>{r.name}</strong>
            <p>DNI: {r.document || 'Por confirmar'}</p>
            <p>{r.location}</p>
            <small>{r.kind}</small>
          </div>
          <button className="secondary-button" onClick={r.open}>
            Abrir ficha
          </button>
        </article>
      ))}
      {rows.length > 25 && (
        <div className="secure-pagination">
          <button
            className="secondary-button"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </button>
          <span>
            Página {page + 1} de {Math.ceil(rows.length / 25)}
          </span>
          <button
            className="secondary-button"
            disabled={(page + 1) * 25 >= rows.length}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </section>
  );
}
