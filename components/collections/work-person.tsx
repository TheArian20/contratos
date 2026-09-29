'use client';
import { WorkSelect } from './work-select';
import { useState } from 'react';
import { Plus, ArrowLeft, FileText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  accountTotals,
  installmentBalance,
  soles,
  type WorkState,
  type Person,
} from '@/lib/work-ledger';
import { workError, type WorkModal, type Candidate } from './work-shared';
export function WorkPerson({
  state,
  person,
  candidates,
  admin,
  canEdit,
  onBack,
  onModal,
  onPay,
  onSource,
  onSearch,
  onRefresh,
}: {
  state: WorkState;
  person: Person;
  candidates: Candidate[];
  admin: boolean;
  canEdit: boolean;
  onBack: () => void;
  onModal: (m: WorkModal) => void;
  onPay: (id: string) => void;
  onSource: (s: number, r: number) => void;
  onSearch: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const lots = state.lots.filter((l) => l.person_id === person.id),
    lotIds = new Set(lots.map((l) => l.id)),
    accounts = state.accounts.filter((a) => lotIds.has(a.lot_id)),
    accountIds = new Set(accounts.map((a) => a.id)),
    sourceIds = new Set(
      state.sources
        .filter((s) => s.person_id === person.id)
        .map((s) => s.record_id),
    );
  const payments = state.payments.filter(
    (p) => accountIds.has(p.account_id ?? '') || sourceIds.has(p.record_id),
  );
  return (
    <>
      <button className="secondary-button" onClick={onBack}>
        <ArrowLeft size={16} /> Volver a personas
      </button>
      <section className="panel person-heading">
        <div>
          <p className="eyebrow">FICHA DE PERSONA CONFIRMADA</p>
          <h2>{person.name}</h2>
          <p>
            DNI / identificación: {person.document || 'Por confirmar'} ·{' '}
            {person.phone || 'Teléfono por confirmar'}
          </p>
          <p>{person.address || 'Dirección por confirmar'}</p>
        </div>
        <div className="work-actions">
          {admin && (
            <button
              className="secondary-button"
              onClick={() => onModal({ kind: 'person-edit', person })}
            >
              Corregir datos
            </button>
          )}
          {canEdit && (
            <button
              className="primary-button"
              onClick={() => onModal({ kind: 'task', person })}
            >
              Anotar gestión
            </button>
          )}
        </div>
      </section>
      <Tabs defaultValue="cuentas">
        <TabsList className="person-tabs">
          <TabsTrigger value="cuentas">Lotes y cuentas</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="gestiones">Seguimiento</TabsTrigger>
          <TabsTrigger value="historial">Historial de cambios</TabsTrigger>
          <TabsTrigger value="origen">Ver origen</TabsTrigger>
        </TabsList>
        <TabsContent value="cuentas">
          <div className="excel-controls">
            <h2>Lotes de {person.name}</h2>
            {admin && (
              <button
                className="primary-button"
                onClick={() => onModal({ kind: 'lot', person })}
              >
                <Plus size={17} /> Confirmar lote
              </button>
            )}
          </div>
          {!lots.length && (
            <p className="panel secure-content">
              Todavía no hay lotes confirmados. Consulta el origen y confirma
              cada lote por separado.
            </p>
          )}
          {lots.map((l) => (
            <section className="panel lot-account-card" key={l.id}>
              <div className="excel-controls">
                <div>
                  <h3>{l.name}</h3>
                  <p>
                    {l.project} · Contrato: {l.contract || 'Por confirmar'}
                  </p>
                </div>
                {admin && (
                  <div className="work-actions">
                    <button
                      className="secondary-button"
                      onClick={() => onModal({ kind: 'lot', lot: l, person })}
                    >
                      Corregir lote
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() =>
                        onModal({ kind: 'account', lot: l, person })
                      }
                    >
                      Agregar concepto
                    </button>
                  </div>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Acordado</TableHead>
                    <TableHead>Pagado confirmado</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts
                    .filter((a) => a.lot_id === l.id)
                    .map((a) => {
                      const totals = accountTotals(a, state.payments);
                      return (
                        <TableRow key={a.id}>
                          <TableCell>{a.concept}</TableCell>
                          <TableCell>
                            {a.agreed === null
                              ? 'Por confirmar'
                              : soles(a.agreed)}
                          </TableCell>
                          <TableCell>
                            {soles(totals.paid)}
                            <small className="record-kind">
                              Histórico:{' '}
                              {a.opening_confirmed
                                ? soles(a.opening)
                                : 'Por confirmar'}{' '}
                              · Nuevos: {soles(totals.newPaid)}
                            </small>
                          </TableCell>
                          <TableCell>
                            {totals.balance === null ? (
                              <span className="pending-label">
                                Por confirmar
                              </span>
                            ) : (
                              soles(totals.balance)
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="work-actions">
                              {canEdit && (
                                <button
                                  className="primary-button"
                                  onClick={() => onPay(a.id)}
                                >
                                  Registrar pago
                                </button>
                              )}
                              {admin && (
                                <>
                                  <button
                                    className="secondary-button"
                                    onClick={() =>
                                      onModal({
                                        kind: 'account',
                                        account: a,
                                        lot: l,
                                        person,
                                      })
                                    }
                                  >
                                    Corregir cuenta
                                  </button>
                                  {!state.installments.some(
                                    (i) => i.account_id === a.id,
                                  ) && (
                                    <button
                                      className="secondary-button"
                                      onClick={() =>
                                        onModal({
                                          kind: 'plan',
                                          account: a,
                                          lot: l,
                                          person,
                                        })
                                      }
                                    >
                                      Programar cuotas
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
              {!accounts.some((a) => a.lot_id === l.id) && (
                <p>
                  Agrega los conceptos que correspondan a este lote. Si falta el
                  importe, déjalo por confirmar.
                </p>
              )}
              {state.installments
                .filter((i) =>
                  accounts.some(
                    (a) => a.id === i.account_id && a.lot_id === l.id,
                  ),
                )
                .map((i) => (
                  <div className="installment-line" key={i.id}>
                    <span>
                      {accounts.find((a) => a.id === i.account_id)?.concept} ·{' '}
                      {i.due}
                    </span>
                    <strong>
                      {installmentBalance(i, state.payments) === 0
                        ? 'Pagada'
                        : `${soles(installmentBalance(i, state.payments))} pendiente`}
                    </strong>
                    {admin && (
                      <button
                        className="secondary-button"
                        onClick={() =>
                          onModal({
                            kind: 'due',
                            person,
                            account: accounts.find(
                              (a) => a.id === i.account_id,
                            ),
                            installment: i,
                          })
                        }
                      >
                        Corregir vencimiento
                      </button>
                    )}
                  </div>
                ))}
            </section>
          ))}
        </TabsContent>
        <TabsContent value="pagos">
          <section className="panel secure-content">
            <h2>Pagos confirmados y anulaciones</h2>
            <p>
              Los importes históricos del Excel se revisan en «Ver origen». Aquí
              aparecen los pagos registrados en el sistema.
            </p>
            {payments.map((p) => (
              <article
                className={`payment-work-row ${p.void_reason ? 'voided' : ''}`}
                key={p.id}
              >
                <div>
                  <strong>
                    {soles(p.cents)} · {p.concept}
                  </strong>
                  <p>
                    {p.lot} · {p.date} · Recibo {p.reference}
                  </p>
                  <small>
                    {p.author}
                    {!p.account_id
                      ? ' · Pendiente de vincular a una cuenta'
                      : ''}
                  </small>
                  {p.void_reason && (
                    <p>
                      Anulado: {p.void_reason} · {p.void_author}
                    </p>
                  )}
                </div>
                {admin && !p.void_reason && (
                  <div className="work-actions">
                    {!p.account_id && (
                      <button
                        className="secondary-button"
                        onClick={() =>
                          onModal({ kind: 'assign', payment: p, person })
                        }
                      >
                        Vincular a cuenta
                      </button>
                    )}
                    <button
                      className="secondary-button"
                      onClick={() =>
                        onModal({ kind: 'void', payment: p, person })
                      }
                    >
                      Anular con motivo
                    </button>
                  </div>
                )}
              </article>
            ))}
            {!payments.length && <p>No hay pagos nuevos registrados.</p>}
          </section>
        </TabsContent>
        <TabsContent value="documentos">
          <section className="panel secure-content">
            <h2>Documentos de la persona</h2>
            {error && <p role="alert">{error}</p>}
            {notice && <output>{notice}</output>}
            {state.documents
              .filter((d) => sourceIds.has(d.record_id))
              .map((d) => (
                <a
                  download
                  className="document-row"
                  key={d.id}
                  href={`/api/secure/document?id=${d.id}`}
                >
                  <FileText size={18} />
                  <span>
                    {d.name}
                    <small>
                      {d.category} · {d.author}
                    </small>
                  </span>
                </a>
              ))}
            {!state.documents.some((d) => sourceIds.has(d.record_id)) && (
              <p>
                No hay archivos adjuntos. Las rutas del Excel no son archivos
                cargados.
              </p>
            )}
            {canEdit && (
              <form
                className="secure-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  setBusy(true);
                  setError('');
                  try {
                    const response = await fetch('/api/secure/documents', {
                      method: 'POST',
                      credentials: 'same-origin',
                      body: new FormData(form),
                    });
                    const result = (await response.json()) as {
                      error?: string;
                    };
                    if (!response.ok) throw new Error(result.error);
                    await onRefresh();
                    form.reset();
                    setNotice('Documento adjuntado al expediente.');
                  } catch (err) {
                    setError(workError(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label htmlFor="work-person-1">
                  Expediente de origen
                  <WorkSelect id="work-person-1" name="recordId" required>
                    {[...sourceIds].map((id) => (
                      <option key={id} value={id}>
                        {candidates.find((c) => c.id === id)?.project ??
                          'Origen'}{' '}
                        · {id.split(':').at(-1)}
                      </option>
                    ))}
                  </WorkSelect>
                </label>
                <label htmlFor="work-person-2">
                  Tipo
                  <WorkSelect id="work-person-2" name="category">
                    <option>Contrato</option>
                    <option>Cobranza</option>
                    <option>Otro documento</option>
                  </WorkSelect>
                </label>
                <label>
                  Archivo · PDF, JPG, PNG o WebP, hasta 10 MB
                  <input
                    name="file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    required
                  />
                </label>
                <button className="primary-button" disabled={busy}>
                  Adjuntar contrato o documento
                </button>
              </form>
            )}
          </section>
        </TabsContent>
        <TabsContent value="gestiones">
          <section className="panel secure-content">
            <div className="excel-controls">
              <h2>Gestiones y compromisos</h2>
              {canEdit && (
                <button
                  className="primary-button"
                  onClick={() => onModal({ kind: 'task', person })}
                >
                  Anotar gestión
                </button>
              )}
            </div>
            {state.tasks
              .filter((t) => t.person_id === person.id)
              .sort((a, b) => a.due.localeCompare(b.due))
              .map((t) => (
                <article className="agenda-work-row" key={t.id}>
                  <div>
                    <strong>
                      {t.kind} · {t.done ? 'Completada' : 'Pendiente'}
                    </strong>
                    <p>{t.description}</p>
                    <small>
                      {t.due} {t.amount !== null ? `· ${soles(t.amount)}` : ''}{' '}
                      · {t.author}
                    </small>
                  </div>
                  {canEdit && (
                    <button
                      className="secondary-button"
                      onClick={() =>
                        onModal({ kind: 'task-status', task: t, person })
                      }
                    >
                      {t.done ? 'Reabrir' : 'Marcar completada'}
                    </button>
                  )}
                </article>
              ))}
            {state.entries
              .filter((e) => sourceIds.has(e.record_id))
              .map((e) => (
                <article className="source-group" key={e.id}>
                  <strong>{e.kind}</strong>
                  <p>{e.body}</p>
                  <small>
                    {e.author} · {e.created.slice(0, 10)}
                  </small>
                </article>
              ))}
          </section>
        </TabsContent>
        <TabsContent value="historial">
          <section className="panel secure-content">
            <h2>Quién cambió qué y cuándo</h2>
            {state.changes
              .filter((c) => c.person_id === person.id)
              .sort((a, b) => b.created.localeCompare(a.created))
              .map((c) => (
                <details className="change-row" key={c.id}>
                  <summary>
                    <strong>{c.entity}</strong> · {c.author} ·{' '}
                    {new Date(c.created).toLocaleString('es-PE')}
                  </summary>
                  <p>Motivo: {c.reason}</p>
                  <div className="change-comparison">
                    <div>
                      <h3>Antes</h3>
                      <ChangeValues value={c.before} />
                    </div>
                    <div>
                      <h3>Después</h3>
                      <ChangeValues value={c.after} />
                    </div>
                  </div>
                </details>
              ))}
          </section>
        </TabsContent>
        <TabsContent value="origen">
          <section className="panel secure-content">
            <div className="excel-controls">
              <h2>Registros originales vinculados</h2>
              {admin && (
                <button className="secondary-button" onClick={onSearch}>
                  Buscar más registros
                </button>
              )}
            </div>
            <p>
              Los vínculos fueron revisados por el equipo. El Excel original
              permanece intacto.
            </p>
            {state.sources
              .filter((s) => s.person_id === person.id)
              .map((s) => (
                <div className="agenda-work-row" key={s.record_id}>
                  <div>
                    <strong>
                      {candidates.find((c) => c.id === s.record_id)?.project ??
                        'Registro original'}
                    </strong>
                    <p>{candidates.find((c) => c.id === s.record_id)?.lot}</p>
                    <small>{s.reason}</small>
                  </div>
                  <div className="work-actions">
                    <button
                      className="secondary-button"
                      onClick={() => {
                        const [, sheet, row] = s.record_id.split(':');
                        onSource(Number(sheet), Number(row));
                      }}
                    >
                      Ver origen
                    </button>
                    {admin && (
                      <button
                        className="secondary-button"
                        onClick={() =>
                          onModal({
                            kind: 'unlink',
                            person,
                            recordId: s.record_id,
                          })
                        }
                      >
                        Corregir vínculo
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
function ChangeValues({ value }: { value: string }) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    parsed = value;
  }
  if (parsed === null) return <p>Sin registro anterior</p>;
  const labels: Record<string, string> = {
    name: 'Nombre',
    document: 'Identificación',
    phone: 'Teléfono',
    address: 'Dirección',
    records: 'Referencias',
    recordId: 'Referencia',
    lotId: 'Lote',
    accountId: 'Cuenta',
    concept: 'Concepto',
    lot: 'Lote',
    project: 'Proyecto',
    contract: 'Contrato',
    agreed: 'Acordado (céntimos)',
    opening: 'Histórico pagado (céntimos)',
    openingDate: 'Corte histórico',
    opening_date: 'Corte histórico',
    cents: 'Importe (céntimos)',
    due: 'Vencimiento',
    date: 'Fecha',
    reference: 'Recibo',
    void_reason: 'Motivo de anulación',
    done: 'Completada',
    description: 'Descripción',
    amount: 'Importe (céntimos)',
    evidence: 'Comprobación',
  };
  if (typeof parsed !== 'object')
    return (
      <p>
        {typeof parsed === 'string' ||
        typeof parsed === 'number' ||
        typeof parsed === 'boolean'
          ? String(parsed)
          : ''}
      </p>
    );
  if (Array.isArray(parsed))
    return (
      <ul>
        {parsed.map((item, i) => (
          <li key={i}>
            <ChangeValues value={JSON.stringify(item)} />
          </li>
        ))}
      </ul>
    );
  return (
    <dl>
      {Object.entries(parsed)
        .filter(
          ([key]) =>
            ![
              'id',
              'version',
              'person_id',
              'lot_id',
              'created',
              'operation',
              'account_id',
              'installment_id',
            ].includes(key),
        )
        .map(([key, item]) => (
          <div key={key}>
            <dt>{labels[key] ?? key}</dt>
            <dd>
              {item === null ? (
                'Por confirmar'
              ) : typeof item === 'object' ? (
                <ChangeValues value={JSON.stringify(item)} />
              ) : (
                String(item)
              )}
            </dd>
          </div>
        ))}
    </dl>
  );
}
