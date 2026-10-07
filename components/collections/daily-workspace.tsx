'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Search,
  UserRound,
  Wallet,
  ClipboardCheck,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  organizeSheet,
  recordKey,
  clean,
  type Dataset,
} from '@/lib/source-data';
import {
  accountTotals,
  installmentBalance,
  soles,
  todayLocal,
  type WorkState,
} from '@/lib/work-ledger';
import {
  workCall,
  workError,
  type WorkModal,
  type Candidate,
} from './work-shared';
import { WorkPerson } from './work-person';
import { WorkForm } from './work-form';
import { PaymentWizard } from './payment-wizard';
const empty: WorkState = {
  people: [],
  sources: [],
  lots: [],
  accounts: [],
  payments: [],
  installments: [],
  tasks: [],
  changes: [],
  documents: [],
  entries: [],
};
export function DailyWorkspace({
  data,
  role,
  onSource,
  onBrowse,
}: {
  data: Dataset | null;
  role: string;
  onBrowse: (query: string) => void;
  onSource: (sheet: number, row: number, hash?: string) => void;
}) {
  const [state, setState] = useState<WorkState>(empty),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('Hoy'),
    [personId, setPersonId] = useState(''),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(0),
    [modal, setModal] = useState<WorkModal | null>(null),
    [paymentTarget, setPaymentTarget] = useState('');
  const admin = role === 'Administrador',
    canEdit = role !== 'Consulta',
    today = todayLocal();
  useEffect(() => {
    let cancelled = false;
    void workCall<WorkState>('desk-state')
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch((e) => {
        if (!cancelled) setError(workError(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const refresh = async () => {
    setState(await workCall<WorkState>('desk-state'));
  };
  const save = async (path: string, body: unknown) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await workCall<{ id?: string }>(path, body);
      await refresh();
      setNotice('Guardado. La ficha y el historial están actualizados.');
      return result;
    } catch (e) {
      setError(workError(e));
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const candidates: Candidate[] = useMemo(
    () =>
      data
        ? data.sheets.flatMap((s, i) =>
            organizeSheet(s, i, data.styles, data)
              .records.filter((r) => r.kind === 'Expediente')
              .map((r) => ({
                id: recordKey(data, r),
                flags: r.situation.labels,
                sheet: i,
                row: r.row,
                name: r.person,
                document: r.document,
                lot: r.situation.retiredFromCiudad
                  ? `Retirado de Ciudad de Dios · Historial: ${r.lot}`
                  : r.situation.noLot
                    ? `Sin lote vigente · Historial: ${r.lot}`
                    : r.lot,
                contract: r.contract,
                project: r.project,
              })),
          )
        : [],
    [data],
  );
  const linked = new Set(state.sources.map((s) => s.record_id)),
    pending = candidates.filter((c) => !linked.has(c.id));
  const person = state.people.find((p) => p.id === personId);
  const balances = state.accounts.map((a) => ({
    account: a,
    ...accountTotals(a, state.payments),
  }));
  const due = state.installments
    .map((i) => ({ ...i, remaining: installmentBalance(i, state.payments) }))
    .filter((i) => i.remaining > 0)
    .sort((a, b) => a.due.localeCompare(b.due));
  const upcoming = new Date(`${today}T12:00:00Z`);
  upcoming.setUTCDate(upcoming.getUTCDate() + 7);
  const until = upcoming.toISOString().slice(0, 10);
  const openPerson = (id: string) => {
    setPersonId(id);
    setTab('Personas');
    setQuery('');
    setPage(0);
  };
  const ownerOf = (accountId: string) => {
    const a = state.accounts.find((a) => a.id === accountId),
      l = state.lots.find((l) => l.id === a?.lot_id),
      p = state.people.find((p) => p.id === l?.person_id);
    return { a, l, p };
  };
  const showPay = (id = '') => {
    setPaymentTarget(id);
    setTab('Registrar pago');
  };
  const filteredPeople = state.people.filter((p) =>
    clean(`${p.name} ${p.document} ${p.phone}`).includes(clean(query)),
  );
  const filteredPending = pending.filter((c) =>
    clean(`${c.name} ${c.document} ${c.lot} ${c.project}`).includes(
      clean(query),
    ),
  );
  if (loading)
    return (
      <section className="panel secure-content">
        <p>Cargando tu trabajo diario…</p>
      </section>
    );
  return (
    <div className="daily-workspace">
      <div className="page-heading">
        <div>
          <p className="eyebrow">TU EQUIPO · TU CARTERA</p>
          <h1>¿Qué necesitas hacer?</h1>
          <p className="subtitle">
            Elige una opción. Te guiaremos paso a paso.
          </p>
        </div>
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => {
            void refresh()
              .then(() => setError(''))
              .catch((e) => setError(workError(e)));
          }}
        >
          Actualizar
        </button>
      </div>
      <nav className="daily-nav" aria-label="Trabajo diario">
        {[
          { name: 'Hoy', label: 'Inicio', icon: CalendarDays },
          { name: 'Personas', label: 'Personas y lotes', icon: UserRound },
          ...(canEdit
            ? [
                {
                  name: 'Registrar pago',
                  label: 'Registrar pago',
                  icon: Wallet,
                },
              ]
            : []),
          {
            name: 'Pendientes de revisar',
            label: 'Revisar fichas',
            icon: ClipboardCheck,
          },
        ].map((item) => (
          <button
            key={item.name}
            className={tab === item.name ? 'active' : ''}
            onClick={() => {
              setTab(item.name);
              setQuery('');
              setPage(0);
              if (item.name === 'Personas') setPersonId('');
            }}
          >
            <item.icon size={19} />
            {item.label}
          </button>
        ))}
      </nav>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && <output className="notice">{notice}</output>}
      {tab === 'Hoy' && (
        <>
          <section className="panel easy-start">
            <h2>Busca a la persona</h2>
            <p>
              Escribe su nombre, DNI, lote o contrato. La búsqueda incluye todas
              las hojas del Excel.
            </p>
            <form
              className="easy-search"
              onSubmit={(e) => {
                e.preventDefault();
                onBrowse(query.trim());
              }}
            >
              <label className="search-field">
                <Search size={20} />
                <input
                  aria-label="Buscar en toda la base"
                  placeholder="Escribe aquí un nombre, DNI o lote"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <button className="primary-button">Buscar</button>
            </form>
            <div className="easy-actions">
              <button
                onClick={() => {
                  setTab('Personas');
                  setPersonId('');
                  setQuery('');
                  setPage(0);
                }}
              >
                <UserRound size={27} />
                <strong>Ver personas y lotes</strong>
                <span>Abre una ficha para ver sus datos y cuánto debe.</span>
              </button>
              {canEdit && (
                <button
                  onClick={() => {
                    setTab('Registrar pago');
                    setPaymentTarget('');
                  }}
                >
                  <Wallet size={27} />
                  <strong>Registrar un pago</strong>
                  <span>Elige la persona, escribe el importe y confirma.</span>
                </button>
              )}
              <button onClick={() => onBrowse('')}>
                <ClipboardCheck size={27} />
                <strong>Contratos y documentos</strong>
                <span>
                  Busca a la persona, pulsa Abrir ficha y entra en Documentos.
                </span>
              </button>
            </div>
          </section>
          <h2 className="easy-section-title">Lo que necesitas revisar hoy</h2>
          <div className="secure-summary">
            <div>
              <span>Personas con ficha</span>
              <strong>{state.people.length}</strong>
            </div>
            <div>
              <span>Total pendiente confirmado</span>
              <strong>
                {balances.some((a) => a.balance !== null)
                  ? soles(balances.reduce((n, a) => n + (a.balance ?? 0), 0))
                  : 'Por confirmar'}
              </strong>
              <small>
                {balances.filter((a) => a.balance === null).length} cuentas por
                confirmar · no incluidas
              </small>
            </div>
            <div>
              <span>Cuotas vencidas</span>
              <strong>{due.filter((i) => i.due < today).length}</strong>
              <small>Solo vencimientos programados</small>
            </div>
            <div>
              <span>Tareas pendientes</span>
              <strong>{state.tasks.filter((t) => !t.done).length}</strong>
            </div>
          </div>
          {!state.people.length && (
            <section className="panel onboarding">
              <h2>Empieza buscando una persona</h2>
              <p>
                Puedes consultar el Excel desde el buscador de arriba. Para
                registrar pagos, Administración debe revisar primero la ficha,
                el lote y los importes de esa persona.
              </p>
              <button
                className="primary-button"
                onClick={() => setTab('Pendientes de revisar')}
              >
                Revisar personas del Excel
              </button>
            </section>
          )}
          <div className="daily-columns">
            <section className="panel secure-content">
              <h2>Cuotas vencidas y próximos 7 días</h2>
              {due
                .filter((i) => i.due <= until)
                .map((i) => {
                  const { a, l, p } = ownerOf(i.account_id);
                  return (
                    <div className="agenda-work-row" key={i.id}>
                      <div>
                        <strong>{p?.name}</strong>
                        <p>
                          {l?.name} · {a?.concept} · {soles(i.remaining)}
                        </p>
                        <small className={i.due < today ? 'overdue-text' : ''}>
                          {i.due < today ? 'Vencida' : 'Vence'}: {i.due}
                        </small>
                      </div>
                      <button
                        className="secondary-button"
                        onClick={() => p && openPerson(p.id)}
                      >
                        Ver cuenta
                      </button>
                    </div>
                  );
                })}
              {!due.some((i) => i.due <= until) && (
                <p>
                  No hay cuotas programadas por cobrar en este período. Los
                  registros sin fechas confirmadas no se clasifican como
                  vencidos.
                </p>
              )}
            </section>
            <section className="panel secure-content">
              <h2>Compromisos y gestiones pendientes</h2>
              {state.tasks
                .filter((t) => !t.done)
                .sort((a, b) => a.due.localeCompare(b.due))
                .map((t) => (
                  <div className="agenda-work-row" key={t.id}>
                    <div>
                      <strong>
                        {state.people.find((p) => p.id === t.person_id)?.name}
                      </strong>
                      <p>
                        {t.kind} · {t.due}
                        {t.amount !== null ? ` · ${soles(t.amount)}` : ''}
                      </p>
                      <small>{t.description}</small>
                    </div>
                    <button
                      className="secondary-button"
                      onClick={() => openPerson(t.person_id)}
                    >
                      Abrir
                    </button>
                  </div>
                ))}
              {!state.tasks.some((t) => !t.done) && (
                <p>
                  No tienes compromisos ni gestiones pendientes. Puedes
                  registrarlos desde una ficha.
                </p>
              )}
            </section>
          </div>
        </>
      )}
      {tab === 'Personas' && !person && (
        <section className="panel secure-content">
          <div className="excel-controls">
            <h2>Personas con ficha de trabajo</h2>
            <button
              className="secondary-button"
              onClick={() => onBrowse(query)}
            >
              Buscar también en el Excel
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                setTab('Pendientes de revisar');
                setQuery('');
              }}
            >
              Revisar una persona del Excel
            </button>
          </div>
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="Buscar persona confirmada"
              placeholder="Nombre, DNI o teléfono"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Identificación</TableHead>
                <TableHead>Lotes confirmados</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPeople.slice(page * 25, page * 25 + 25).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <strong>{p.name}</strong>
                    <small className="record-kind">
                      {p.phone || 'Teléfono por confirmar'}
                    </small>
                  </TableCell>
                  <TableCell>{p.document || 'Por confirmar'}</TableCell>
                  <TableCell>
                    {state.lots.filter((l) => l.person_id === p.id).length}
                  </TableCell>
                  <TableCell>
                    <button
                      className="secondary-button"
                      onClick={() => openPerson(p.id)}
                    >
                      Abrir ficha
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!filteredPeople.length && (
            <p>
              No hay fichas confirmadas que coincidan. Puedes buscar en
              Pendientes de revisar.
            </p>
          )}
          <Pager page={page} count={filteredPeople.length} onPage={setPage} />
        </section>
      )}
      {tab === 'Personas' && person && (
        <WorkPerson
          state={state}
          person={person}
          candidates={candidates}
          admin={admin}
          canEdit={canEdit}
          onBack={() => setPersonId('')}
          onModal={setModal}
          onPay={showPay}
          onSource={onSource}
          onSearch={() => {
            setTab('Pendientes de revisar');
            setQuery(person.document || person.name);
            setPage(0);
          }}
          onRefresh={refresh}
        />
      )}
      {tab === 'Registrar pago' &&
        (canEdit ? (
          !state.accounts.length ? (
            <section className="panel secure-content">
              <h2>Primero necesitamos una cuenta para el pago</h2>
              <p>
                Administración debe revisar la persona, confirmar su lote y
                agregar el concepto que pagará, por ejemplo, agua o lote.
              </p>
              <button
                className="primary-button"
                onClick={() => {
                  setTab('Pendientes de revisar');
                  setQuery('');
                }}
              >
                Revisar una persona
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setTab('Personas');
                  setPersonId('');
                  setQuery('');
                }}
              >
                Ver personas con ficha
              </button>
            </section>
          ) : (
            <PaymentWizard
              candidates={candidates}
              key={paymentTarget || 'all'}
              state={state}
              initialAccount={paymentTarget}
              onSave={save}
              onOpenPerson={openPerson}
            />
          )
        ) : (
          <p className="panel secure-content">
            Tu cuenta permite consultar. Solicita a un gestor el registro de
            pagos.
          </p>
        ))}
      {tab === 'Pendientes de revisar' && (
        <section className="panel secure-content">
          <h2>Confirmar personas antes de agrupar registros</h2>
          <p>
            Compara identificación, nombre, contrato y lote. Una coincidencia de
            nombre no confirma que sea la misma persona.
          </p>
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="Buscar registros pendientes"
              value={query}
              placeholder="Buscar nombre, DNI, lote o proyecto"
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona en el Excel</TableHead>
                <TableHead>DNI / contrato</TableHead>
                <TableHead>Proyecto / lote</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPending.slice(page * 25, page * 25 + 25).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.name}
                    <small className="source-pending">
                      {c.flags?.join(' · ')}
                    </small>
                  </TableCell>
                  <TableCell>
                    {c.document || 'Por confirmar'}
                    <small className="record-kind">{c.contract}</small>
                  </TableCell>
                  <TableCell>
                    {c.project}
                    <small className="record-kind">
                      {c.lot || 'Por confirmar'}
                    </small>
                  </TableCell>
                  <TableCell>
                    <div className="work-actions">
                      <button
                        className="secondary-button"
                        onClick={() => onSource(c.sheet, c.row)}
                      >
                        Ver origen
                      </button>
                      {admin && (
                        <button
                          className="primary-button"
                          onClick={() =>
                            setModal({ kind: 'confirm', candidate: c })
                          }
                        >
                          Revisar y confirmar
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={page} count={filteredPending.length} onPage={setPage} />
          <p className="secure-footnote">
            Las filas sin nombre reconocido siguen disponibles en Archivo
            original. No se convierten automáticamente en personas.
          </p>
        </section>
      )}
      {modal && (
        <WorkForm
          modal={modal}
          state={state}
          candidates={pending}
          busy={busy}
          onClose={() => setModal(null)}
          onSource={onSource}
          onSave={save}
          onPerson={openPerson}
        />
      )}
    </div>
  );
}
function Pager({
  page,
  count,
  onPage,
}: {
  page: number;
  count: number;
  onPage: (n: number) => void;
}) {
  return (
    <div className="secure-pagination">
      <span>
        {count} registros · Página {page + 1} de{' '}
        {Math.max(1, Math.ceil(count / 25))}
      </span>
      <button
        className="secondary-button"
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
      >
        Anterior
      </button>
      <button
        className="secondary-button"
        disabled={(page + 1) * 25 >= count}
        onClick={() => onPage(page + 1)}
      >
        Siguiente
      </button>
    </div>
  );
}
