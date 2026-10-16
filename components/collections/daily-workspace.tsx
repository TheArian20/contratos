'use client';
import { CommitmentsPanel } from './commitments-panel';
import { DuplicatePanel } from './duplicate-panel';
import { ClosingPanel } from './closing-panel';
import type { DuplicateRecord } from '@/lib/daily-operations';
import { useRecentVisits } from '@/hooks/use-recent-visits';
import { personGaps } from '@/lib/work-ease';
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
  availableProjects,
  recordKey,
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
import { ReportPanel } from './report-panel';
import { confirmedSummary } from '@/lib/reports';
import { recordColors } from '@/lib/record-colors';
import { WorkPerson } from './work-person';
import { WorkForm } from './work-form';
import { NewPerson } from './new-person';
import { ColorLegend } from './color-legend';
import { colorStyle, colorLabel } from '@/lib/record-colors';
import { PersonSearch } from './person-search';
import { matchesPerson, matchesSearch } from '@/lib/person-search';
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
  userId,
  onAdmin,
  data,
  role,
  onSource,
  onBrowse,
  author,
  initialPersonId = '',
  initialTab = 'Hoy',
}: {
  userId: string;
  onAdmin: (destination: string) => void;
  author: string;
  initialPersonId?: string;
  initialTab?: string;
  data: Dataset | null;
  role: string;
  onBrowse: (query: string) => void;
  onSource: (sheet: number, row: number, hash?: string) => void;
}) {
  const recent = useRecentVisits(userId);
  const [projectFilter, setProjectFilter] = useState(''),
    [colorFilter, setColorFilter] = useState('all'),
    [statusFilter, setStatusFilter] = useState(''),
    [sort, setSort] = useState('name');
  const [creating, setCreating] = useState(false);
  const [state, setState] = useState<WorkState>(empty),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const [tab, setTab] = useState(initialPersonId ? 'Personas' : initialTab),
    [personId, setPersonId] = useState(initialPersonId),
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
      try {
        await refresh();
        setNotice('Cambios guardados correctamente.');
      } catch {
        setNotice(
          'Los cambios se guardaron. Pulsa Actualizar para ver la ficha actualizada.',
        );
      }
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
  const duplicateRecords: DuplicateRecord[] = useMemo(
    () => [
      ...candidates.map((c) => ({
        ...c,
        personId: state.sources.find((s) => s.record_id === c.id)?.person_id,
      })),
      ...state.people.flatMap((p) => {
        const lots = state.lots.filter((l) => l.person_id === p.id);
        return lots.length
          ? lots.map((l) => ({
              id: 'lot:' + l.id,
              personId: p.id,
              name: p.name,
              document: p.document,
              project: l.project,
              lot: l.name,
            }))
          : [
              {
                id: 'person:' + p.id,
                personId: p.id,
                name: p.name,
                document: p.document,
                project: p.project || '',
                lot: '',
              },
            ];
      }),
    ],
    [candidates, state.people, state.lots, state.sources],
  );
  const openDuplicate = (record: DuplicateRecord) => {
    if (record.personId) openPerson(record.personId);
    else if (record.sheet !== undefined && record.row !== undefined)
      onSource(record.sheet, record.row);
  };
  const person = state.people.find((p) => p.id === personId);
  const remember = recent.remember;
  useEffect(() => {
    if (person && tab === 'Personas')
      remember({ kind: 'person', id: person.id });
  }, [person?.id, tab, remember]);
  const recentRows = recent.visits.flatMap((visit) => {
    if (visit.kind === 'person') {
      const p = state.people.find((p) => p.id === visit.id);
      if (!p) return [];
      return [
        {
          key: 'person:' + p.id,
          name: p.name,
          detail: [
            p.document || 'DNI pendiente',
            ...state.lots
              .filter((l) => l.person_id === p.id)
              .map((l) => `${l.project} · ${l.name}`),
          ].join(' · '),
          open: () => openPerson(p.id),
        },
      ];
    }
    const c = candidates.find((c) => c.id === visit.id);
    return c
      ? [
          {
            key: 'source:' + c.id,
            name: c.name,
            detail: `${c.document || 'DNI pendiente'} · ${c.project} · ${c.lot || 'Lote por confirmar'}`,
            open: () => onSource(c.sheet, c.row),
          },
        ]
      : [];
  });
  const incomplete = state.people
    .map((p) => ({ person: p, gaps: personGaps(p, state) }))
    .filter((p) => p.gaps.length);
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
  const filteredPeople = state.people
    .filter((p) => {
      const lots = state.lots.filter((l) => l.person_id === p.id),
        accounts = state.accounts.filter((a) =>
          lots.some((l) => l.id === a.lot_id),
        ),
        summary = confirmedSummary(accounts, state);
      return (
        matchesPerson(query, p, state.lots) &&
        (!projectFilter ||
          p.project === projectFilter ||
          lots.some((l) => l.project === projectFilter)) &&
        (colorFilter === 'all' || (p.color || '') === colorFilter) &&
        (!statusFilter ||
          (statusFilter === 'pending'
            ? !accounts.length || summary.unknown > 0
            : statusFilter === 'debt'
              ? summary.balance > 0
              : summary.confirmed > 0 &&
                summary.unknown === 0 &&
                summary.balance === 0))
      );
    })
    .sort(
      (a, b) =>
        (sort.endsWith('-desc') ? -1 : 1) *
        String(sort.startsWith('document') ? a.document : a.name).localeCompare(
          String(sort.startsWith('document') ? b.document : b.name),
          'es',
          { numeric: true, sensitivity: 'base' },
        ),
    );
  const filteredPending = pending.filter((c) =>
    matchesSearch(query, [c.name, c.document, c.lot, c.project, c.contract]),
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
          data-navigation
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
      <nav data-navigation className="daily-nav" aria-label="Trabajo diario">
        {[
          { name: 'Hoy', label: 'Inicio', icon: CalendarDays },
          { name: 'Buscar', label: 'Buscar persona', icon: Search },
          { name: 'Personas', label: 'Personas y lotes', icon: UserRound },
          {
            name: 'Compromisos',
            label: 'Compromisos de pago',
            icon: CalendarDays,
          },
          { name: 'Duplicados', label: 'Posibles duplicados', icon: Search },
          { name: 'Cierre diario', label: 'Cierre diario', icon: Wallet },
          { name: 'Reportes', label: 'Reportes', icon: ClipboardCheck },
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
              if (item.name === 'Personas') {
                setPersonId('');
                setStatusFilter('');
              }
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
      {(tab === 'Hoy' || tab === 'Buscar') && (
        <>
          {tab === 'Hoy' && (
            <section className="panel role-home">
              <p className="eyebrow">{role.toLocaleUpperCase('es-PE')}</p>
              <h2>
                {admin
                  ? 'Organiza y supervisa el trabajo'
                  : canEdit
                    ? 'Empieza tu jornada'
                    : 'Consulta personas y documentos'}
              </h2>
              <p>
                {admin
                  ? 'Revisa los datos pendientes, las cuentas del equipo y los respaldos.'
                  : canEdit
                    ? 'Busca una persona para registrar pagos, adjuntar documentos o dejar observaciones. Las gestiones que ves son del equipo.'
                    : 'Busca por nombre, DNI o lote. Dentro de la ficha puedes consultar los documentos y el estado de sus cuentas.'}
              </p>
              {admin && (
                <div className="work-actions" data-navigation>
                  <button
                    className="secondary-button"
                    onClick={() => onAdmin('Equipo')}
                  >
                    Administrar equipo
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => onAdmin('Respaldos')}
                  >
                    Crear respaldo
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => onAdmin('Actualizar base')}
                  >
                    Actualizar Excel
                  </button>
                </div>
              )}
            </section>
          )}
          <section className="panel easy-start">
            <h2>Busca a la persona</h2>
            <p>
              Escribe su nombre, DNI, lote o contrato. La búsqueda incluye todas
              las hojas del Excel y las fichas creadas en la página. Puedes
              escribir desde una letra; en los lotes no necesitas copiar puntos
              ni guiones.
            </p>
            <details className="context-help">
              <summary>Ejemplos de búsqueda</summary>
              <p>
                Nombre: «Elvis». Lote: «B24AA», «B.24AA» o «B-24AA». Comprueba
                el DNI, el proyecto y el lote antes de abrir una ficha si hay
                nombres parecidos.
              </p>
            </details>
            <ColorLegend />
            <form
              className="easy-search"
              onSubmit={(e) => {
                e.preventDefault();
                setTab('Buscar');
              }}
            >
              <label className="search-field">
                <Search size={20} />
                <input
                  aria-label="Buscar en toda la base"
                  placeholder="Nombre, DNI, contrato, manzana o lote"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setTab('Buscar');
                  }}
                />
              </label>
              <button className="primary-button">Buscar</button>
            </form>
            <div className="easy-actions" data-navigation>
              <button
                onClick={() => {
                  setTab('Buscar');
                  document
                    .querySelector<HTMLInputElement>(
                      '[aria-label="Buscar en toda la base"]',
                    )
                    ?.focus();
                }}
              >
                <Search size={27} />
                <strong>Buscar persona</strong>
                <span>
                  Encuentra fichas y expedientes en una sola búsqueda.
                </span>
              </button>
              {canEdit && (
                <button onClick={() => setCreating(true)}>
                  <UserRound size={27} />
                  <strong>Nueva persona</strong>
                  <span>Crea una ficha y añade su primer lote.</span>
                </button>
              )}
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
              {canEdit && (
                <button
                  onClick={() => {
                    setTab('Pendientes de revisar');
                    setQuery('');
                    setPage(0);
                  }}
                >
                  <ClipboardCheck size={27} />
                  <strong>Pendientes de revisar</strong>
                  <span>
                    Revisa los registros que todavía no tienen ficha de trabajo.
                  </span>
                </button>
              )}
            </div>
          </section>
          {tab === 'Buscar' && (
            <PersonSearch
              key={query}
              query={query}
              state={state}
              candidates={candidates}
              onPerson={openPerson}
              onSource={onSource}
            />
          )}
          {tab === 'Hoy' && (
            <>
              <section className="panel secure-content">
                <div className="section-heading">
                  <h2>Fichas recientes</h2>
                  {recentRows.length > 0 && (
                    <button className="secondary-button" onClick={recent.clear}>
                      Limpiar recientes
                    </button>
                  )}
                </div>
                <p>Solo tus visitas en esta pestaña del navegador.</p>
                {!recentRows.length && (
                  <p>
                    Al abrir una ficha, aparecerá aquí para encontrarla más
                    rápido.
                  </p>
                )}
                <div className="recent-grid">
                  {recentRows.map((r) => (
                    <button
                      className="recent-card"
                      key={r.key}
                      onClick={r.open}
                    >
                      <strong>{r.name}</strong>
                      <span>{r.detail}</span>
                      <span>Abrir ficha →</span>
                    </button>
                  ))}
                </div>
              </section>
              {canEdit && incomplete.length > 0 && (
                <section className="panel secure-content">
                  <h2>Completar información · {incomplete.length} fichas</h2>
                  <p>
                    Datos pendientes de las fichas de trabajo. No son deudas ni
                    errores confirmados.
                  </p>
                  {incomplete.slice(0, 5).map(({ person: p, gaps }) => (
                    <div className="agenda-work-row" key={p.id}>
                      <div>
                        <strong>{p.name}</strong>
                        <p>
                          DNI: {p.document || 'Por confirmar'} · {gaps[0].label}
                          {gaps.length > 1
                            ? ` · ${gaps.length - 1} avisos más`
                            : ''}
                        </p>
                      </div>
                      <button
                        className="secondary-button"
                        onClick={() => openPerson(p.id)}
                      >
                        Revisar ficha
                      </button>
                    </div>
                  ))}
                  {incomplete.length > 5 && (
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setTab('Personas');
                        setPersonId('');
                        setQuery('');
                        setPage(0);
                      }}
                    >
                      Ver todas las personas
                    </button>
                  )}
                </section>
              )}
              <h2 className="easy-section-title">
                {canEdit ? 'Agenda del equipo' : 'Resumen de consulta'}
              </h2>
              <div className="secure-summary">
                <div>
                  <span>Personas con ficha</span>
                  <button
                    className="metric-link"
                    onClick={() => {
                      setTab('Personas');
                      setPersonId('');
                      setQuery('');
                      setProjectFilter('');
                      setColorFilter('all');
                      setStatusFilter('');
                      setPage(0);
                    }}
                  >
                    Ver personas →
                  </button>
                  <strong>{state.people.length}</strong>
                </div>
                <div>
                  <span>Total pendiente confirmado</span>
                  <button
                    className="metric-link"
                    onClick={() => {
                      setTab('Personas');
                      setPersonId('');
                      setQuery('');
                      setProjectFilter('');
                      setColorFilter('all');
                      setStatusFilter('debt');
                      setPage(0);
                    }}
                  >
                    Ver cuentas →
                  </button>
                  <strong>
                    {balances.some((a) => a.balance !== null)
                      ? soles(
                          balances.reduce((n, a) => n + (a.balance ?? 0), 0),
                        )
                      : 'Por confirmar'}
                  </strong>
                  <small>
                    {balances.filter((a) => a.balance === null).length} cuentas
                    por confirmar · no incluidas
                  </small>
                </div>
                <div>
                  <span>Cuotas vencidas</span>
                  <button
                    className="metric-link"
                    onClick={() =>
                      document
                        .getElementById('agenda-cuotas')
                        ?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    Ver vencimientos →
                  </button>
                  <strong>{due.filter((i) => i.due < today).length}</strong>
                  <small>Solo vencimientos programados</small>
                </div>
                <div>
                  <span>Tareas pendientes</span>
                  <button
                    className="metric-link"
                    onClick={() =>
                      document
                        .getElementById('agenda-tareas')
                        ?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    Ver pendientes →
                  </button>
                  <strong>{state.tasks.filter((t) => !t.done).length}</strong>
                </div>
              </div>
              {canEdit && !state.people.length && (
                <section className="panel onboarding">
                  <h2>Empieza buscando una persona</h2>
                  <p>
                    Puedes consultar el Excel desde el buscador de arriba. Para
                    registrar pagos, Administración debe revisar primero la
                    ficha, el lote y los importes de esa persona.
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
                  <h2 id="agenda-cuotas">Cuotas vencidas y próximos 7 días</h2>
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
                            <small
                              className={i.due < today ? 'overdue-text' : ''}
                            >
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
                  <h2 id="agenda-tareas">Compromisos y gestiones pendientes</h2>
                  {state.tasks
                    .filter((t) => !t.done)
                    .sort((a, b) => a.due.localeCompare(b.due))
                    .map((t) => (
                      <div className="agenda-work-row" key={t.id}>
                        <div>
                          <strong>
                            {
                              state.people.find((p) => p.id === t.person_id)
                                ?.name
                            }
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
        </>
      )}
      {tab === 'Compromisos' && (
        <CommitmentsPanel
          state={state}
          canEdit={canEdit}
          onSave={save}
          onPerson={openPerson}
        />
      )}
      {tab === 'Duplicados' && (
        <DuplicatePanel records={duplicateRecords} onOpen={openDuplicate} />
      )}
      {tab === 'Cierre diario' && (
        <ClosingPanel
          state={state}
          sources={duplicateRecords}
          author={author}
        />
      )}
      {tab === 'Reportes' && (
        <ReportPanel state={state} author={author} admin={admin} />
      )}
      {tab === 'Personas' && !person && (
        <section className="panel secure-content">
          <div className="excel-controls">
            <h2>Personas con ficha de trabajo</h2>
            {canEdit && (
              <button
                className="primary-button"
                onClick={() => setCreating(true)}
              >
                Nueva persona
              </button>
            )}
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
          <ColorLegend />
          <div className="secure-filters">
            <label>
              Proyecto
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Todos</option>
                {[
                  ...new Set(
                    [
                      ...state.people.map((p) => p.project),
                      ...state.lots.map((l) => l.project),
                    ].filter(Boolean),
                  ),
                ]
                  .sort()
                  .map((p) => (
                    <option key={p}>{p}</option>
                  ))}
              </select>
            </label>
            <label>
              Color
              <select
                value={colorFilter}
                onChange={(e) => {
                  setColorFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">Todos</option>
                {recordColors.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Estado de cuentas
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Todos</option>
                <option value="pending">Por confirmar</option>
                <option value="debt">Con saldo confirmado</option>
                <option value="paid">Cuentas confirmadas en cero</option>
              </select>
            </label>
            <label>
              Ordenar
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(0);
                }}
              >
                <option value="name">Nombre A–Z</option>
                <option value="name-desc">Nombre Z–A</option>
                <option value="document">DNI ascendente</option>
                <option value="document-desc">DNI descendente</option>
              </select>
            </label>
            <button
              className="secondary-button"
              onClick={() => {
                setProjectFilter('');
                setColorFilter('all');
                setStatusFilter('');
                setSort('name');
                setQuery('');
                setPage(0);
              }}
            >
              Limpiar filtros
            </button>
          </div>
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="Buscar persona confirmada"
              placeholder="Nombre, DNI, teléfono, proyecto, contrato o lote"
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
                <TableHead
                  aria-sort={
                    sort === 'name'
                      ? 'ascending'
                      : sort === 'name-desc'
                        ? 'descending'
                        : 'none'
                  }
                >
                  <button
                    className="table-sort"
                    onClick={() => {
                      setSort(sort === 'name' ? 'name-desc' : 'name');
                      setPage(0);
                    }}
                  >
                    Persona{' '}
                    {sort === 'name' ? '↑' : sort === 'name-desc' ? '↓' : '↕'}
                  </button>
                </TableHead>
                <TableHead
                  aria-sort={
                    sort === 'document'
                      ? 'ascending'
                      : sort === 'document-desc'
                        ? 'descending'
                        : 'none'
                  }
                >
                  <button
                    className="table-sort"
                    onClick={() => {
                      setSort(
                        sort === 'document' ? 'document-desc' : 'document',
                      );
                      setPage(0);
                    }}
                  >
                    Identificación{' '}
                    {sort === 'document'
                      ? '↑'
                      : sort === 'document-desc'
                        ? '↓'
                        : '↕'}
                  </button>
                </TableHead>
                <TableHead>Lotes confirmados</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPeople.slice(page * 25, page * 25 + 25).map((p) => (
                <TableRow key={p.id} style={colorStyle(p.color)}>
                  <TableCell>
                    <strong>{p.name}</strong>
                    {p.color && (
                      <small className="record-color-label">
                        Etiqueta: {colorLabel(p.color)}
                      </small>
                    )}
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
          author={author}
          key={person.id}
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
          onSave={save}
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
          <ColorLegend />
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
      {creating && (
        <NewPerson
          existing={duplicateRecords}
          onDuplicate={(record) => {
            setCreating(false);
            openDuplicate(record);
          }}
          projects={availableProjects(data)}
          onClose={() => setCreating(false)}
          onSave={save}
          onDone={openPerson}
          busy={busy}
        />
      )}
      {modal && (
        <WorkForm
          onReload={refresh}
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
