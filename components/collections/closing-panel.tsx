'use client';
import { useState } from 'react';
import { dailyClosing, type DuplicateRecord } from '@/lib/daily-operations';
import { soles, todayLocal, validDay, type WorkState } from '@/lib/work-ledger';
export function ClosingPanel({
  state,
  sources,
  author,
}: {
  state: WorkState;
  sources: DuplicateRecord[];
  author: string;
}) {
  const [day, setDay] = useState(todayLocal()),
    [basis, setBasis] = useState<'payment' | 'registration'>('payment');
  const summary = dailyClosing(state, day, sources, basis);
  const table = (
    title: string,
    rows: { label: string; count: number; cents: number }[],
  ) => (
    <section>
      <h3>{title}</h3>
      <table className="closing-table">
        <thead>
          <tr>
            <th>Detalle</th>
            <th>Pagos</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td>{r.count}</td>
              <td>{soles(r.cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p>Sin pagos para esta fecha.</p>}
    </section>
  );
  return (
    <section className="panel secure-content report-panel">
      <div className="report-controls secure-filters">
        <label>
          Fecha del cierre
          <input
            type="date"
            value={day}
            max={todayLocal()}
            onChange={(e) => {
              if (validDay(e.target.value)) setDay(e.target.value);
            }}
          />
        </label>
        <label>
          Contar según
          <select
            value={basis}
            onChange={(e) => setBasis(e.target.value as typeof basis)}
          >
            <option value="payment">Fecha del pago</option>
            <option value="registration">Fecha de registro en la página</option>
          </select>
        </label>
        <button
          className="primary-button"
          onClick={() => {
            document.body.classList.add('printing-report');
            try {
              window.print();
            } finally {
              document.body.classList.remove('printing-report');
            }
          }}
        >
          Imprimir / guardar PDF
        </button>
      </div>
      <div className="print-report">
        <h2>Resumen de cierre diario · {day}</h2>
        <p>
          Emitido por {author} ·{' '}
          {new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}
        </p>
        <p>
          Criterio:{' '}
          {basis === 'payment'
            ? 'fecha declarada del pago'
            : 'fecha de registro en la página'}
          . Horario de Perú. Es un resumen actualizado, no un cierre contable
          bloqueado.
        </p>
        <div className="report-metrics">
          <div>
            <span>Pagos vigentes</span>
            <strong>{summary.rows.length}</strong>
          </div>
          <div>
            <span>Total registrado</span>
            <strong>{soles(summary.collected)}</strong>
          </div>
          <div>
            <span>Pagos anulados excluidos</span>
            <strong>{summary.excluded.length}</strong>
          </div>
          <div>
            <span>Compromisos pendientes para esta fecha</span>
            <strong>{summary.commitments.length}</strong>
          </div>
        </div>
        <p>
          Los compromisos y los importes históricos no se suman al total.{' '}
          {summary.unconfirmed.length} pagos corresponden a cuentas cuyo saldo
          aún no está confirmado; el abono se conserva, sin deducir un saldo.
        </p>
        {table('Por proyecto', summary.byProject)}
        {table('Por concepto', summary.byConcept)}
        {table('Por gestor (nombre registrado)', summary.byCollector)}
        <p>
          El desglose por gestor usa el nombre guardado al registrar el pago;
          nombres iguales aparecen agrupados.
        </p>
        <h3>Detalle de pagos vigentes</h3>
        <div className="closing-scroll">
          <table className="closing-table">
            <thead>
              <tr>
                <th>Persona / lote</th>
                <th>Concepto</th>
                <th>Recibo</th>
                <th>Gestor</th>
                <th>Importe</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((r) => (
                <tr key={r.payment.id}>
                  <td>
                    {r.person}
                    <br />
                    {r.project} · {r.lot}
                  </td>
                  <td>
                    {r.payment.concept}
                    {r.unconfirmed && <small> · Saldo por confirmar</small>}
                  </td>
                  <td>{r.payment.reference}</td>
                  <td>{r.payment.author}</td>
                  <td>{soles(r.payment.cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>Anulaciones realizadas ese día</h3>
        {summary.cancellations.length ? (
          summary.cancellations.map((p) => (
            <p key={p.id}>
              Recibo {p.reference} · pago del {p.date} · {soles(p.cents)} ·{' '}
              {p.void_reason} · {p.void_author}
            </p>
          ))
        ) : (
          <p>No hubo anulaciones registradas ese día.</p>
        )}
        <h3>Pagos de la selección que están anulados</h3>
        {summary.excluded.map((p) => (
          <p key={p.id}>
            {p.reference} · {soles(p.cents)} · {p.void_reason}
          </p>
        ))}
      </div>
    </section>
  );
}
