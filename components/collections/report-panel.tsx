'use client';
import { useState } from 'react';
import { confirmedSummary, monthReport } from '@/lib/reports';
import {
  accountTotals,
  soles,
  todayLocal,
  type WorkState,
} from '@/lib/work-ledger';
export function ReportPanel({
  state,
  author,
  personId = '',
  admin = false,
}: {
  state: WorkState;
  author: string;
  personId?: string;
  admin?: boolean;
}) {
  const [month, setMonth] = useState(() => todayLocal().slice(0, 7));
  const [person, setPerson] = useState(personId),
    [lot, setLot] = useState('');
  const [generated] = useState(() =>
    new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
  );
  const lots = state.lots.filter((l) => l.person_id === person);
  const accounts = state.accounts.filter(
    (a) => lots.some((l) => l.id === a.lot_id) && (!lot || a.lot_id === lot),
  );
  const totals = confirmedSummary(accounts, state),
    monthly = monthReport(state, month);
  const selected = state.people.find((p) => p.id === person);
  const payments = person
    ? state.payments.filter(
        (p) => !p.void_reason && accounts.some((a) => a.id === p.account_id),
      )
    : monthly.payments;
  return (
    <section className="panel secure-content report-panel">
      <div className="report-controls secure-filters">
        {!personId && (
          <label>
            Informe
            <select
              value={person}
              onChange={(e) => {
                setPerson(e.target.value);
                setLot('');
              }}
            >
              <option value="">Resumen mensual</option>
              {state.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.document}
                </option>
              ))}
            </select>
          </label>
        )}
        {person ? (
          <label>
            Lote
            <select value={lot} onChange={(e) => setLot(e.target.value)}>
              <option value="">Todos los lotes de la persona</option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.project} · {l.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            Mes
            <input
              type="month"
              value={month}
              required
              onChange={(e) => {
                if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value))
                  setMonth(e.target.value);
              }}
            />
          </label>
        )}
        <button
          className="primary-button"
          onClick={() => {
            document.body.classList.add('printing-report');
            window.print();
            document.body.classList.remove('printing-report');
          }}
        >
          Imprimir / guardar PDF
        </button>
      </div>
      <div className="print-report">
        <header className="report-header">
          <div>
            <p className="eyebrow">CARTERA · CONTRATOS Y COBRANZAS</p>
            <h2>
              {person ? 'Estado de cuenta' : 'Informe mensual de gestión'}
            </h2>
          </div>
          <p>
            Emitido: {generated}
            <br />
            Responsable de emisión: {author}
          </p>
        </header>
        <p>
          {person
            ? `${selected?.name} · DNI: ${selected?.document || 'Por confirmar'}`
            : `Período: ${month}`}
        </p>
        <div className="report-metrics">
          {person ? (
            <>
              <div>
                <span>Pagado confirmado</span>
                <strong>{soles(totals.paid)}</strong>
              </div>
              <div>
                <span>Saldo confirmado</span>
                <strong>
                  {totals.confirmed ? soles(totals.balance) : 'Por confirmar'}
                </strong>
              </div>
              <div>
                <span>Cuentas por confirmar</span>
                <strong>{totals.unknown}</strong>
              </div>
            </>
          ) : (
            <>
              <div>
                <span>Cobrado vigente del mes</span>
                <strong>{soles(monthly.collected)}</strong>
              </div>
              <div>
                <span>Pagos vigentes</span>
                <strong>{monthly.payments.length}</strong>
              </div>
              <div>
                <span>Personas registradas</span>
                <strong>{monthly.people.length}</strong>
              </div>
              <div>
                <span>Documentos añadidos</span>
                <strong>{monthly.documents.length}</strong>
              </div>
              <div>
                <span>Observaciones añadidas</span>
                <strong>{monthly.entries.length}</strong>
              </div>
              <div>
                <span>Anulaciones realizadas</span>
                <strong>{monthly.voided.length}</strong>
              </div>
            </>
          )}
        </div>
        <p className="report-note">
          {person
            ? 'Estado actual. Los importes históricos sin confirmar no se incluyen en el pagado ni en el saldo confirmado. Las cuentas incompletas se indican por separado.'
            : 'Pagos según fecha del recibo, excluyendo los anulados al momento de emitir este informe. Actividad por fecha de registro en Perú. Este informe refleja el estado actual y puede cambiar si se corrigen pagos.'}{' '}
          No se convierten los valores del Excel en saldos confirmados.
        </p>
        {person && (
          <>
            <h3>Detalle por lote y concepto</h3>
            <table>
              <thead>
                <tr>
                  <th>Proyecto / lote</th>
                  <th>Concepto</th>
                  <th>Acordado</th>
                  <th>Pagado confirmado</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => {
                  const t = accountTotals(a, state.payments),
                    l = lots.find((l) => l.id === a.lot_id);
                  return (
                    <tr key={a.id}>
                      <td>
                        {l?.project} · {l?.name}
                      </td>
                      <td>{a.concept}</td>
                      <td>
                        {a.agreed === null ? 'Por confirmar' : soles(a.agreed)}
                      </td>
                      <td>
                        {soles(
                          t.newPaid + (a.opening_confirmed ? a.opening : 0),
                        )}
                      </td>
                      <td>
                        {t.balance === null
                          ? 'Por confirmar'
                          : soles(t.balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!accounts.length && (
              <p>No hay cuentas registradas para esta selección.</p>
            )}
          </>
        )}
        <h3>
          {person
            ? 'Pagos vinculados a las cuentas seleccionadas'
            : 'Detalle de cobranza del mes'}
        </h3>
        <table>
          <thead>
            <tr>
              <th>Fecha / recibo</th>
              <th>Persona / lote</th>
              <th>Concepto</th>
              <th>Importe</th>
              <th>Registrado por</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const a = state.accounts.find((a) => a.id === p.account_id),
                l = state.lots.find((l) => l.id === a?.lot_id),
                owner = state.people.find((x) => x.id === l?.person_id);
              return (
                <tr key={p.id}>
                  <td>
                    {p.date}
                    <br />
                    {p.reference}
                  </td>
                  <td>
                    {owner?.name || 'Pendiente de vincular'}
                    <br />
                    {p.lot}
                  </td>
                  <td>{p.concept}</td>
                  <td>{soles(p.cents)}</td>
                  <td>{p.author}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!payments.length && <p>No hay pagos vigentes para esta selección.</p>}
        {!person && admin && (
          <>
            <h3>Actividad de edición · Administración</h3>
            <p>
              {monthly.changes.length} cambios registrados en fichas de trabajo.
              Las correcciones del Excel se consultan en el historial de cada
              expediente.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Acción</th>
                  <th>Cuenta</th>
                </tr>
              </thead>
              <tbody>
                {monthly.changes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {new Date(c.created).toLocaleString('es-PE', {
                        timeZone: 'America/Lima',
                      })}
                    </td>
                    <td>{c.entity}</td>
                    <td>{c.author_username || c.author}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <footer className="report-note">
          Cartera · Documento de consulta interna · Importes en soles (PEN).
        </footer>
      </div>
    </section>
  );
}
