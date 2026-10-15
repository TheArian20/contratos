'use client';
import { personGaps } from '@/lib/work-ease';
import { ObservationCard } from './observation-card';
import { DocumentLibrary } from './document-library';
import { ReportPanel } from './report-panel';
import { confirmedSummary } from '@/lib/reports';
import { PersonObservation } from './person-observation';
import { ColorLegend } from './color-legend';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { WorkSelect } from './work-select';
import { PersonColorEditor } from './person-color-editor';
import { colorStyle, colorLabel } from '@/lib/record-colors';
import { useState } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
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
  author,
}: {
  state: WorkState;
  person: Person;
  candidates: Candidate[];
  admin: boolean;
  canEdit: boolean;
  onBack: () => void;
  onModal: (m: WorkModal) => void;
  onPay: (id: string) => void;
  onSource: (s: number, r: number, hash?: string) => void;
  onSearch: () => void;
  onRefresh: () => Promise<void>;
  author: string;
}) {
  const [tab, setTab] = useState('datos');
  const [documentDirty, setDocumentDirty] = useState(false);
  const [colorEditing, setColorEditing] = useState(false);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const guard = useUnsavedChanges(documentDirty, busy, () =>
    setDocumentDirty(false),
  );
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
  const summary = confirmedSummary(accounts, state);
  const gaps = personGaps(person, state);
  const notes = state.entries.filter((e) => sourceIds.has(e.record_id));
  return (
    <>
      <button data-navigation className="secondary-button" onClick={onBack}>
        <ArrowLeft size={16} /> Volver a personas
      </button>
      <section
        className="panel person-heading"
        style={colorStyle(person.color)}
      >
        <div>
          <p className="eyebrow">FICHA DE PERSONA CONFIRMADA</p>
          <h2>{person.name}</h2>
          {person.color && (
            <p className="record-color-label">
              Etiqueta: {colorLabel(person.color)}
            </p>
          )}
          <p>
            DNI / identificación: {person.document || 'Por confirmar'} ·{' '}
            {person.phone || 'Teléfono por confirmar'}
          </p>
          <p>{person.address || 'Dirección por confirmar'}</p>
          {person.project && (
            <p>
              <strong>Proyecto:</strong> {person.project}
            </p>
          )}
          {candidates
            .filter((c) => sourceIds.has(c.id) && c.flags?.length)
            .map((c) => (
              <p key={c.id} className="source-pending">
                {c.project}: {c.flags?.join(' · ')}. Revisa el origen antes de
                gestionar esta cuenta.
              </p>
            ))}
        </div>
        <div className="work-actions" data-navigation>
          <h3 className="action-heading">¿Qué deseas hacer?</h3>
          {canEdit && (
            <>
              <button
                className="primary-button"
                onClick={() =>
                  accounts.length === 1
                    ? onPay(accounts[0].id)
                    : setTab('cuentas')
                }
              >
                Registrar pago
              </button>
              <button
                className="secondary-button"
                onClick={() => setTab('documentos')}
              >
                Añadir documento
              </button>
              <button
                className="secondary-button"
                onClick={() => setTab('gestiones')}
              >
                Añadir observación
              </button>
            </>
          )}
          {canEdit && (
            <button
              className="secondary-button"
              onClick={() => setColorEditing(true)}
            >
              Cambiar color
            </button>
          )}
          {canEdit && (
            <button
              className="secondary-button"
              onClick={() => onModal({ kind: 'person-edit', person })}
            >
              Editar datos
            </button>
          )}
          {canEdit && (
            <button
              className="primary-button"
              onClick={() => onModal({ kind: 'task', person })}
            >
              Agregar recordatorio
            </button>
          )}
        </div>
      </section>
      {notes
        .filter((e) => e.pinned)
        .map((entry) => (
          <ObservationCard
            key={entry.id}
            entry={entry}
            canEdit={canEdit}
            onRefresh={onRefresh}
          />
        ))}
      {gaps.length > 0 && (
        <section className="panel data-gaps">
          <h3>Datos pendientes de completar</h3>
          <p>
            Estos avisos indican información que falta; no significan que la
            persona tenga deuda.
          </p>
          <ul>
            {gaps.map((gap, index) => (
              <li key={index}>
                <span>{gap.label}</span>
                {canEdit && (
                  <button
                    className="secondary-button"
                    data-navigation
                    onClick={() => {
                      if (gap.action === 'person')
                        onModal({ kind: 'person-edit', person });
                      else if (gap.action === 'lot')
                        onModal({
                          kind: 'lot',
                          person,
                          lot: lots.find((l) => l.id === gap.lotId),
                        });
                      else
                        setTab(
                          gap.action === 'documents' ? 'documentos' : 'cuentas',
                        );
                    }}
                  >
                    {gap.action === 'accounts'
                      ? 'Ver cuentas'
                      : gap.action === 'documents'
                        ? 'Adjuntar contrato'
                        : 'Completar'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="report-metrics person-summary">
        <div>
          <span>Lotes</span>
          <strong>{lots.length}</strong>
        </div>
        <div>
          <span>Pagado confirmado</span>
          <strong>{soles(summary.paid)}</strong>
        </div>
        <div>
          <span>Saldo confirmado</span>
          <strong>
            {summary.confirmed ? soles(summary.balance) : 'Por confirmar'}
          </strong>
          <small>{summary.unknown} cuenta(s) sin confirmar</small>
        </div>
      </div>
      {notice && <output className="notice">{notice}</output>}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList data-navigation className="person-tabs">
          <TabsTrigger value="datos">Datos personales</TabsTrigger>
          <TabsTrigger value="cuentas">Lotes y deudas</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="reporte">Estado de cuenta</TabsTrigger>
          <TabsTrigger value="gestiones">Observaciones</TabsTrigger>
          {admin && (
            <TabsTrigger value="historial">Historial de cambios</TabsTrigger>
          )}
          <TabsTrigger value="origen">Origen del expediente</TabsTrigger>
        </TabsList>
        <TabsContent value="datos">
          <section className="panel secure-content">
            <h2>Datos personales</h2>
            <dl className="source-fields">
              {[
                ['Nombre completo', person.name],
                ['DNI / identificación', person.document],
                ['Teléfono', person.phone],
                ['Dirección', person.address],
                ['Proyecto de registro', person.project],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || 'Por completar'}</dd>
                </div>
              ))}
            </dl>
            <p>
              {lots.length} lote(s) ·{' '}
              {payments.filter((p) => !p.void_reason).length} pago(s)
              registrado(s).
            </p>
            <ColorLegend />
          </section>
        </TabsContent>
        <TabsContent value="cuentas">
          <div className="excel-controls">
            <h2>Lotes y cuentas de {person.name}</h2>
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
                {canEdit && (
                  <div className="work-actions">
                    <button
                      className="secondary-button"
                      onClick={() => onModal({ kind: 'lot', lot: l, person })}
                    >
                      Editar lote
                    </button>
                    {admin && (
                      <button
                        className="secondary-button"
                        onClick={() =>
                          onModal({ kind: 'account', lot: l, person })
                        }
                      >
                        Agregar concepto
                      </button>
                    )}
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
                            {soles(
                              totals.newPaid +
                                (a.opening_confirmed ? a.opening : 0),
                            )}
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
        <TabsContent value="reporte">
          <ReportPanel
            state={state}
            author={author}
            personId={person.id}
            admin={admin}
          />
        </TabsContent>
        <TabsContent value="documentos">
          <section className="panel secure-content">
            <h2>Documentos de la persona</h2>
            {error && <p role="alert">{error}</p>}
            {notice && <output>{notice}</output>}
            <DocumentLibrary
              documents={state.documents.filter((d) =>
                sourceIds.has(d.record_id),
              )}
            />
            {canEdit && (
              <form
                onChange={() => setDocumentDirty(true)}
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
                    guard.markSaved();
                    setDocumentDirty(false);
                    form.reset();
                    setNotice('Documento guardado correctamente.');
                    try {
                      await onRefresh();
                    } catch {
                      setError(
                        'El documento se guardó. Actualiza la página para verlo.',
                      );
                    }
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
                        {id.startsWith('manual:')
                          ? 'Ficha creada en la página'
                          : `${candidates.find((c) => c.id === id)?.project ?? 'Origen'} · ${id.split(':').at(-1)}`}
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
                  {busy ? 'Guardando…' : 'Guardar documento'}
                </button>
              </form>
            )}
          </section>
        </TabsContent>
        <TabsContent value="gestiones">
          <section className="panel secure-content">
            <div className="excel-controls">
              <h2>Observaciones y recordatorios</h2>
              {canEdit && (
                <button
                  className="primary-button"
                  onClick={() => onModal({ kind: 'task', person })}
                >
                  Agregar recordatorio
                </button>
              )}
            </div>
            {canEdit && (
              <PersonObservation
                sources={[...sourceIds].map((id) => ({
                  id,
                  label: id.startsWith('manual:')
                    ? 'Ficha creada en la página'
                    : `${candidates.find((c) => c.id === id)?.project ?? 'Origen'} · Fila ${id.split(':').at(-1)}`,
                }))}
                onSaved={onRefresh}
              />
            )}
            {!state.entries.some((e) => sourceIds.has(e.record_id)) && (
              <p>Aún no hay observaciones guardadas.</p>
            )}
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
            {notes.map((entry) => (
              <ObservationCard
                key={entry.id}
                entry={entry}
                canEdit={canEdit}
                onRefresh={onRefresh}
              />
            ))}
          </section>
        </TabsContent>
        {admin && (
          <TabsContent value="historial">
            <section className="panel secure-content">
              <h2>Quién cambió qué y cuándo</h2>
              {state.changes
                .filter((c) => c.person_id === person.id)
                .sort((a, b) => b.created.localeCompare(a.created))
                .map((c) => (
                  <details className="change-row" key={c.id}>
                    <summary>
                      <strong>{c.entity}</strong> · {c.author}
                      {c.author_username
                        ? ` (@${c.author_username})`
                        : ' (registro anterior)'}{' '}
                      · {new Date(c.created).toLocaleString('es-PE')}
                    </summary>
                    <p>Motivo: {c.reason}</p>
                    {c.author_id && (
                      <small>Identificador de la cuenta: {c.author_id}</small>
                    )}
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
        )}
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
                        (s.record_id.startsWith('manual:')
                          ? 'Ficha creada en la página'
                          : 'Registro original')}
                    </strong>
                    <p>{candidates.find((c) => c.id === s.record_id)?.lot}</p>
                    <p className="source-pending">
                      {candidates
                        .find((c) => c.id === s.record_id)
                        ?.flags?.join(' · ')}
                    </p>
                    <small>{s.reason}</small>
                  </div>
                  <div className="work-actions">
                    {!s.record_id.startsWith('manual:') && (
                      <button
                        className="secondary-button"
                        onClick={() => {
                          const candidate = candidates.find(
                            (c) => c.id === s.record_id,
                          );
                          if (candidate)
                            onSource(candidate.sheet, candidate.row);
                          else {
                            const [hash, sheet, row] = s.record_id.split(':');
                            onSource(Number(sheet), Number(row), hash);
                          }
                        }}
                      >
                        Ver origen
                      </button>
                    )}
                    {admin && !s.record_id.startsWith('manual:') && (
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
      {colorEditing && (
        <PersonColorEditor
          person={person}
          onClose={() => setColorEditing(false)}
          onSaved={async () => {
            await onRefresh();
            setNotice('Cambios guardados correctamente.');
          }}
        />
      )}
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
