'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  FolderClosed,
  Search,
  LogOut,
  Users,
  ShieldCheck,
  FileText,
  ChevronRight,
  Download,
  Menu,
} from 'lucide-react';
import { DatasetUpdatePanel } from './dataset-update-panel';
import { WorkSelect } from './work-select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { DailyWorkspace } from './daily-workspace';
import { Brand, Choice } from './shared';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
  sheetTitle,
  clean,
  cellText,
  groupNames,
  type Dataset,
  type SourceRecord,
  type OrganizedSheet,
} from '@/lib/source-data';

type User = {
  id: string;
  name: string;
  username: string;
  role: string;
  active: boolean;
  mustChange: boolean;
};
type Extras = {
  documents: { id: string; name: string; category: string; author: string }[];
  entries: {
    id: string;
    kind: string;
    body: string;
    author: string;
    created: string;
  }[];
};
async function api<T = { ok: boolean }>(
  path: string,
  method = 'GET',
  data?: unknown,
) {
  const response = await fetch(`/api/secure/${path}`, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers:
      data instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...(method !== 'GET' && data !== undefined
      ? { body: data instanceof FormData ? data : JSON.stringify(data) }
      : {}),
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(result.error || 'No se pudo completar la operación.');
  return result;
}
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : 'Ocurrió un error. Inténtalo de nuevo.';
export function SecurePortal() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [data, setData] = useState<Dataset | null>(null),
    [error, setError] = useState('');
  const [versions, setVersions] = useState<
    { id: string; name: string; created: string }[]
  >([]);
  const [currentHash, setCurrentHash] = useState('');
  const [sourceData, setSourceData] = useState<Dataset | null>(null);
  const [view, setView] = useState('Trabajo diario'),
    [active, setActive] = useState<number | null>(null),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(0),
    [filter, setFilter] = useState('Todos los registros'),
    [menu, setMenu] = useState(false);
  const [selection, setSelection] = useState<{
    sheet: number;
    row: number;
  } | null>(null);
  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const session = await api<{ user: User }>('session');
      setUser(session.user);
      if (!session.user.mustChange) {
        const result = await api<Dataset>('dataset');
        setData(result.version === 1 ? result : null);
        setCurrentHash(result.sourceHash);
        setVersions(await api('dataset-versions'));
      }
    } catch (e) {
      setError(errorText(e));
      setUser(null);
      setData(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let cancelled = false;
    void api<{ user: User }>('session')
      .then(async (session) => {
        if (cancelled) return;
        setUser(session.user);
        if (!session.user.mustChange) {
          const result = await api<Dataset>('dataset');
          const versions =
            await api<{ id: string; name: string; created: string }[]>(
              'dataset-versions',
            );
          if (!cancelled) {
            setData(result.version === 1 ? result : null);
            setCurrentHash(result.sourceHash);
            setVersions(versions);
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(errorText(e));
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const sheets = useMemo(
      () =>
        data?.sheets.map((s, i) => organizeSheet(s, i, data.styles, data)) ??
        [],
      [data],
    ),
    sheet = active === null ? null : sheets[active];
  const records = useMemo(
    () =>
      (sheet ? [sheet] : sheets).flatMap((s) =>
        s.records.map((record) => ({ sheet: s.index, record })),
      ),
    [sheets, sheet],
  );
  const matches = useMemo(
    () =>
      records.filter(({ record }) => {
        if (
          [
            'Pagado totalmente · sin deuda según Excel',
            'Retirado de Ciudad de Dios',
            'Sin lote vigente',
            'Denunciante',
            'No cobrar',
            'Revisión de administración',
          ].includes(filter) &&
          !(filter === 'Pagado totalmente · sin deuda según Excel'
            ? record.situation.paidInFull
            : record.situation.labels.includes(filter))
        )
          return false;
        if (filter === 'Expedientes' && record.kind !== 'Expediente')
          return false;
        if (
          filter === 'Pendientes de identificar' &&
          (record.kind !== 'Expediente' || !!record.document)
        )
          return false;
        if (
          filter === 'Anotaciones y encabezados' &&
          record.kind === 'Expediente'
        )
          return false;
        const term = clean(query);
        return (
          !term ||
          clean(record.lot).includes(term) ||
          record.observations.some((f) =>
            clean(cellText(f.cell)).includes(term),
          ) ||
          record.fields.some((f) => clean(cellText(f.cell)).includes(term))
        );
      }),
    [records, filter, query],
  );
  const selectionSheets = sourceData
    ? sourceData.sheets.map((s, i) =>
        organizeSheet(s, i, sourceData.styles, sourceData),
      )
    : sheets;
  const selected = selection
    ? selectionSheets[selection.sheet]?.records.find(
        (r) => r.row === selection.row,
      )
    : null;
  const choose = (index: number | null) => {
    setActive(index);
    setPage(0);
    setFilter('Todos los registros');
    setView('Base');
    setMenu(false);
  };
  if (loading)
    return (
      <div className="secure-loading">
        <Brand />
        <p>Cargando tu espacio…</p>
      </div>
    );
  if (!user)
    return (
      <AccessForm
        error={error === 'Inicia sesión para acceder.' ? '' : error}
        onLogin={async (username, password) => {
          await api('login', 'POST', { username, password });
          await refresh();
        }}
      />
    );
  if (user.mustChange)
    return (
      <div className="secure-loading">
        <Brand />
        <h1>Establece tu contraseña personal</h1>
        <PasswordForm
          onDone={() => {
            setUser(null);
            setData(null);
          }}
        />
      </div>
    );
  return (
    <div className="secure-app">
      <aside className={`secure-sidebar ${menu ? 'is-open' : ''}`}>
        <Brand />
        <button
          className={view === 'Trabajo diario' ? 'active' : ''}
          onClick={() => {
            if (data?.sourceHash !== currentHash) void refresh();
            setView('Trabajo diario');
            setMenu(false);
          }}
        >
          Inicio
        </button>
        <button
          className={view === 'Base' && active === null ? 'active' : ''}
          onClick={() => choose(null)}
        >
          <FolderClosed size={19} /> Buscar en toda la base
        </button>
        {[
          'Proyectos',
          'Servicios y trámites',
          'Casos especiales',
          'Guía de la base',
          'Otras hojas',
        ].map((category) => {
          const items = sheets.filter((s) => s.category === category);
          return items.length ? (
            <details
              className="secure-nav-group easy-nav-group"
              key={category}
              open={view === 'Base' && sheet?.category === category}
            >
              <summary>{category}</summary>
              {items.map((s) => (
                <button
                  title={s.name}
                  className={
                    view === 'Base' && active === s.index ? 'active' : ''
                  }
                  key={s.name}
                  onClick={() => choose(s.index)}
                >
                  <span>{sheetTitle(s.name)}</span>
                  <small>{s.records.length}</small>
                </button>
              ))}
            </details>
          ) : null;
        })}
        <div className="secure-nav-group">
          <p>Administración</p>
          {user.role === 'Administrador' && (
            <button
              onClick={() => {
                if (data?.sourceHash !== currentHash) void refresh();
                setView('Actualizar base');
                setMenu(false);
              }}
            >
              Actualizar base
            </button>
          )}
          {user.role === 'Administrador' && (
            <button
              onClick={() => {
                setView('Equipo');
                setMenu(false);
              }}
            >
              <Users size={18} /> Equipo
            </button>
          )}
          <button
            onClick={() => {
              setView('Cuenta');
              setMenu(false);
            }}
          >
            <ShieldCheck size={18} /> Mi cuenta
          </button>
        </div>
        <button
          onClick={async () => {
            try {
              await api('logout', 'POST');
              setUser(null);
              setData(null);
              setSelection(null);
            } catch (e) {
              setError(errorText(e));
            }
          }}
        >
          <LogOut size={18} /> Cerrar sesión
        </button>
      </aside>
      <div className="secure-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="help-button"
              aria-label="Abrir navegación"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <span>Cartera</span>
            <ChevronRight size={15} />
            <strong>
              {view === 'Base'
                ? sheet
                  ? sheetTitle(sheet.name)
                  : 'Buscar en toda la base'
                : view === 'Trabajo diario'
                  ? 'Inicio'
                  : view}
            </strong>
          </div>
          <span className="secure-user">
            {user.name} · {user.role}
          </span>
        </header>
        <main>
          {error && (
            <p className="notice" role="alert">
              {error}
              <button onClick={() => setError('')}>Cerrar</button>
            </p>
          )}
          {view === 'Trabajo diario' ? (
            <DailyWorkspace
              data={data}
              role={user.role}
              onBrowse={(term) => {
                choose(null);
                setQuery(term);
                setFilter('Todos los registros');
                setPage(0);
              }}
              onSource={(sheet, row, hash) => {
                if (hash && hash !== data?.sourceHash) {
                  void api<Dataset>(`dataset?id=${encodeURIComponent(hash)}`)
                    .then((source) => {
                      setSourceData(source);
                      setSelection({ sheet, row });
                    })
                    .catch((e) => setError(errorText(e)));
                } else {
                  setSourceData(null);
                  setSelection({ sheet, row });
                }
              }}
            />
          ) : view === 'Actualizar base' ? (
            <DatasetUpdatePanel current={data} onDone={refresh} />
          ) : view === 'Equipo' ? (
            <TeamPanel current={user} />
          ) : view === 'Cuenta' ? (
            <section className="panel secure-content">
              <h1>Mi cuenta</h1>
              <p>
                {user.name} · {user.username}
              </p>
              <PasswordForm
                onDone={() => {
                  setUser(null);
                  setData(null);
                }}
              />
            </section>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ARCHIVO DE CONTRATOS Y COBRANZAS</p>
                  <h1>
                    {sheet ? sheetTitle(sheet.name) : 'Buscar en toda la base'}
                  </h1>
                  <p className="subtitle">
                    {sheet?.description ??
                      'Escribe un nombre, DNI o lote. Pulsa Abrir ficha para consultar sus datos, observaciones y documentos.'}
                  </p>
                </div>
                {user.role === 'Administrador' && data && (
                  <a
                    className="secondary-button"
                    download
                    href={`/api/secure/source?id=${data.sourceHash}`}
                  >
                    <Download size={17} /> Excel original
                  </a>
                )}
              </div>
              {!data ? (
                <section className="panel secure-content">
                  <h2>Preparando la base</h2>
                  <p>
                    La importación verificada aparecerá aquí cuando termine.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => void refresh()}
                  >
                    Actualizar
                  </button>
                </section>
              ) : (
                <>
                  <div className="secure-filters">
                    <label>
                      Versión del archivo{' '}
                      <WorkSelect
                        value={data.sourceHash}
                        onChange={async (e) => {
                          try {
                            const result = await api<Dataset>(
                              `dataset?id=${encodeURIComponent(e.target.value)}`,
                            );
                            setData(result);
                            setActive(null);
                            setPage(0);
                            setSelection(null);
                            setSourceData(null);
                          } catch (e) {
                            setError(errorText(e));
                          }
                        }}
                      >
                        {versions.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                            {v.id === currentHash
                              ? ' · Actual'
                              : ' · Histórica'}
                          </option>
                        ))}
                      </WorkSelect>
                    </label>
                  </div>
                  {data.sourceHash !== currentHash && (
                    <p className="source-pending">
                      Estás consultando una versión histórica. Trabajo diario
                      utiliza la base actual.
                    </p>
                  )}
                  <div className="secure-summary">
                    <div>
                      <span>Hojas conservadas</span>
                      <strong>{sheets.length}</strong>
                    </div>
                    <div>
                      <span>Filas en esta vista</span>
                      <strong>{records.length}</strong>
                    </div>
                    <div>
                      <span>Filas con nombre identificado</span>
                      <strong>
                        {
                          records.filter((r) => r.record.kind === 'Expediente')
                            .length
                        }
                      </strong>
                    </div>
                    <div>
                      <span>Saldos del Excel</span>
                      <strong className="pending-label">Por validar</strong>
                    </div>
                  </div>
                  {active === null && !query && (
                    <div className="project-grid">
                      {sheets.map((s) => (
                        <button
                          key={s.name}
                          className="project-card"
                          onClick={() => choose(s.index)}
                        >
                          <div>
                            <FolderClosed size={21} />
                            <small>{s.category}</small>
                          </div>
                          <h2>{sheetTitle(s.name)}</h2>
                          <p>{s.description}</p>
                          <span>
                            {s.records.length} filas de origen{' '}
                            <ChevronRight size={16} />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          {sheet?.category === 'Guía de la base'
                            ? 'Descripciones del archivo'
                            : 'Registros y expedientes'}
                        </h2>
                        <p>
                          Importes según el Excel · TOTAL A COBRAR pendiente ·
                          Sin fusiones automáticas
                        </p>
                      </div>
                    </div>
                    <div className="secure-filters">
                      <label className="search-field">
                        <Search size={18} />
                        <input
                          aria-label="Buscar registros"
                          placeholder="Persona, DNI, lote, contrato o descripción"
                          value={query}
                          onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(0);
                          }}
                        />
                      </label>
                      <Choice
                        label="Tipo de registro"
                        value={filter}
                        options={[
                          'Todos los registros',
                          'Expedientes',
                          'Pagado totalmente · sin deuda según Excel',
                          'Retirado de Ciudad de Dios',
                          'Sin lote vigente',
                          'Denunciante',
                          'No cobrar',
                          'Revisión de administración',
                          'Pendientes de identificar',
                          'Anotaciones y encabezados',
                        ]}
                        onChange={(v) => {
                          setFilter(v);
                          setPage(0);
                        }}
                      />
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setQuery('');
                          setFilter('Todos los registros');
                          setPage(0);
                        }}
                      >
                        Limpiar
                      </button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Persona / descripción</TableHead>
                          <TableHead>Identificación / contrato</TableHead>
                          <TableHead>Lote / ubicación</TableHead>
                          <TableHead>Origen</TableHead>
                          <TableHead>Abrir</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matches
                          .slice(page * 25, page * 25 + 25)
                          .map(({ sheet: si, record: r }) => (
                            <TableRow
                              key={`${si}:${r.row}`}
                              style={
                                r.situation.paidInFull
                                  ? { background: '#FF99CC', color: '#172b3a' }
                                  : undefined
                              }
                            >
                              <TableCell>
                                <strong>
                                  {r.person ||
                                    r.fields
                                      .map((f) => cellText(f.cell))
                                      .filter(Boolean)
                                      .slice(0, 2)
                                      .join(' · ') ||
                                    'Fila con formato'}
                                </strong>
                                <small className="record-kind">{r.kind}</small>
                                {r.observations.length > 0 && (
                                  <details>
                                    <summary>
                                      {r.observations.length} observación(es)
                                    </summary>
                                    {r.observations.map((f) => (
                                      <p key={f.coordinate}>
                                        <strong>
                                          {f.header} · {f.coordinate}:
                                        </strong>{' '}
                                        {cellText(f.cell)}
                                      </p>
                                    ))}
                                  </details>
                                )}
                                {r.situation.labels.map((label) => (
                                  <small key={label} className="source-pending">
                                    {label}
                                  </small>
                                ))}
                              </TableCell>
                              <TableCell>
                                {r.document || 'Identificación pendiente'}
                                <small className="record-kind">
                                  {r.contract}
                                </small>
                              </TableCell>
                              <TableCell>
                                {r.situation.retiredFromCiudad
                                  ? `Retirado de Ciudad de Dios · Ubicación histórica: ${r.lot || 'sin detalle'}`
                                  : r.situation.noLot
                                    ? `Sin lote vigente · Ubicación histórica: ${r.lot || 'sin detalle'}`
                                    : r.lot || 'Sin ubicación identificada'}
                              </TableCell>
                              <TableCell>
                                {sheets[si].name}
                                <small className="record-kind">
                                  Fila {r.row}
                                </small>
                              </TableCell>
                              <TableCell>
                                <button
                                  className="secondary-button"
                                  onClick={() => {
                                    setSourceData(null);
                                    setSelection({ sheet: si, row: r.row });
                                  }}
                                >
                                  Abrir ficha
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                    {!matches.length && (
                      <p className="secure-content">
                        No hay registros con estos filtros.
                      </p>
                    )}
                    <div className="secure-pagination">
                      <span>
                        {matches.length} registros · Página {page + 1} de{' '}
                        {Math.max(1, Math.ceil(matches.length / 25))}
                      </span>
                      <button
                        className="secondary-button"
                        disabled={page === 0}
                        onClick={() => setPage(page - 1)}
                      >
                        Anterior
                      </button>
                      <button
                        className="secondary-button"
                        disabled={(page + 1) * 25 >= matches.length}
                        onClick={() => setPage(page + 1)}
                      >
                        Siguiente
                      </button>
                    </div>
                  </section>
                  <p className="secure-footnote">
                    {data.sourceName} · Todos los valores conservan su hoja y
                    celda. Los vacíos no se convierten en cero. Las correcciones
                    se anotan sin sobrescribir el original.
                  </p>
                </>
              )}
            </>
          )}
        </main>
      </div>
      {selected && selection && data && (
        <RecordPanel
          key={`${selection.sheet}:${selection.row}`}
          record={selected}
          sheet={selectionSheets[selection.sheet]}
          data={sourceData ?? data}
          user={user}
          onClose={() => {
            setSelection(null);
            setSourceData(null);
          }}
          onRelated={(document) => {
            choose(null);
            setQuery(document);
            setSelection(null);
          }}
        />
      )}
    </div>
  );
}
function AccessForm({
  error,
  onLogin,
}: {
  error: string;
  onLogin: (username: string, password: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(error);
  return (
    <div className="secure-login">
      <section>
        <Brand />
        <p className="eyebrow">ESPACIO DE TU EQUIPO</p>
        <h1>
          Contratos y cobranzas,
          <br />
          en un solo lugar.
        </h1>
        <p>Accede a tus proyectos, lotes, documentos y seguimiento.</p>
      </section>
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setMessage('');
          try {
            await onLogin(
              f.get('username') as string,
              f.get('password') as string,
            );
          } catch (err) {
            setMessage(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <ShieldCheck size={30} />
        <h2>Iniciar sesión</h2>
        <p>Ingresa con la cuenta de tu equipo.</p>
        <label>
          Usuario
          <input name="username" autoComplete="username" required />
        </label>
        <label>
          Contraseña
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {message && (
          <p role="alert" className="form-error">
            {message}
          </p>
        )}
        <button className="primary-button" disabled={busy}>
          {busy ? 'Ingresando…' : 'Entrar a mi espacio'}
        </button>
        <small>Las cuentas se crean desde Administración.</small>
      </form>
    </div>
  );
}
function PasswordForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="secure-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        if (f.get('password') !== f.get('confirm')) {
          setError('Las contraseñas no coinciden.');
          return;
        }
        setBusy(true);
        try {
          await api('password', 'POST', {
            current: f.get('current'),
            password: f.get('password'),
          });
          onDone();
        } catch (err) {
          setError(errorText(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Cambiar contraseña</h2>
      <label>
        Contraseña actual
        <input
          type="password"
          name="current"
          autoComplete="current-password"
          required
        />
      </label>
      <label>
        Nueva contraseña · mínimo 8 caracteres
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <label>
        Repetir nueva contraseña
        <input
          type="password"
          name="confirm"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button className="primary-button" disabled={busy}>
        {busy ? 'Guardando…' : 'Guardar y volver a iniciar sesión'}
      </button>
    </form>
  );
}
function TeamPanel({ current }: { current: User }) {
  const [deleting, setDeleting] = useState<User | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [users, setUsers] = useState<User[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [role, setRole] = useState('Consulta');
  const load = async () => {
    try {
      setUsers(await api<User[]>('users'));
    } catch (e) {
      setError(errorText(e));
    }
  };
  useEffect(() => {
    let cancelled = false;
    void api<User[]>('users')
      .then((rows) => {
        if (!cancelled) setUsers(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(errorText(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div className="secure-team">
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cuenta</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el acceso de {deleting?.name} (@{deleting?.username})
              y se cerrarán sus sesiones. Su historial de modificaciones, pagos
              y documentos se conserva. Esta cuenta no podrá reactivarse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="grid gap-2">
            Escribe {deleting?.username} para confirmar
            <input
              className="rounded-lg border p-3"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
              disabled={busy}
            />
          </label>
          {deleteError && <p role="alert">{deleteError}</p>}
          <AlertDialogFooter>
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={busy || !deleting || confirmation !== deleting.username}
              onClick={async () => {
                if (!deleting) return;
                setBusy(true);
                setDeleteError('');
                try {
                  await api('users', 'DELETE', {
                    id: deleting.id,
                    confirmUsername: confirmation,
                  });
                  setDeleting(null);
                  await load();
                } catch (e) {
                  setDeleteError(errorText(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Eliminando…' : 'Eliminar definitivamente'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <section className="panel secure-content">
        <h1>Equipo de trabajo</h1>
        <p>
          Administración gestiona usuarios y consulta el historial de cambios.
          Gestor puede corregir personas y lotes existentes, registrar pagos,
          documentos y gestiones. Consulta solo lee. Las cuentas activas ven la
          base completa; el historial de modificaciones es exclusivo de
          Administración.
        </p>
        {error && <p role="alert">{error}</p>}
        {users.map((u) => (
          <div className="team-row" key={u.id}>
            <span>
              <strong>{u.name}</strong>
              <small>
                {u.username} · {u.role} · {u.active ? 'Activo' : 'Desactivado'}
              </small>
            </span>
            {u.id !== current.id && (
              <div className="work-actions">
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api('users', 'PATCH', {
                        id: u.id,
                        active: !u.active,
                      });
                      await load();
                    } catch (e) {
                      setError(errorText(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {u.active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => {
                    setDeleting(u);
                    setConfirmation('');
                    setDeleteError('');
                  }}
                >
                  Eliminar cuenta
                </button>
              </div>
            )}
          </div>
        ))}
      </section>
      <form
        className="panel secure-content secure-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            f = new FormData(form);
          setBusy(true);
          setError('');
          try {
            await api('users', 'POST', {
              name: f.get('name'),
              username: f.get('username'),
              password: f.get('password'),
              role,
            });
            form.reset();
            await load();
          } catch (err) {
            setError(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Crear una cuenta</h2>
        <label>
          Nombre
          <input name="name" required maxLength={100} />
        </label>
        <label>
          Usuario
          <input
            name="username"
            pattern="[a-zA-Z0-9._-]{3,60}"
            required
            autoComplete="off"
          />
        </label>
        <label>
          Contraseña inicial
          <input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
          />
        </label>
        <Choice
          label="Rol de usuario"
          value={role}
          options={['Consulta', 'Gestor', 'Administrador']}
          onChange={setRole}
        />
        <p>La persona tendrá que cambiar su contraseña al ingresar.</p>
        <button className="primary-button" disabled={busy}>
          Crear usuario
        </button>
      </form>
    </div>
  );
}
function RecordPanel({
  record,
  sheet,
  data,
  user,
  onClose,
  onRelated,
}: {
  record: SourceRecord;
  sheet: OrganizedSheet;
  data: Dataset;
  user: User;
  onClose: () => void;
  onRelated: (document: string) => void;
}) {
  const id = recordKey(data, record),
    [extras, setExtras] = useState<Extras>({ documents: [], entries: [] }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [category, setCategory] = useState('Contrato'),
    [kind, setKind] = useState('Gestión');
  const load = async () => {
    try {
      setExtras(await api<Extras>(`record?id=${encodeURIComponent(id)}`));
    } catch (e) {
      setError(errorText(e));
    }
  };
  useEffect(() => {
    let cancelled = false;
    void api<Extras>(`record?id=${encodeURIComponent(id)}`)
      .then((rows) => {
        if (!cancelled) setExtras(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(errorText(e));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  const renderFields = (fields: SourceRecord['fields']) => (
    <dl className="source-fields">
      {fields.map((f) => {
        const style = data.styles?.[f.cell.style ?? ''];
        return (
          <div key={f.coordinate}>
            <dt>
              {f.header}
              <small>{f.coordinate}</small>
            </dt>
            <dd>{cellText(f.cell) || 'Sin valor registrado'}</dd>
            {style && (style.fill || style.color) && (
              <small className="source-style">
                {style.fill && <span style={{ backgroundColor: style.fill }} />}
                {style.color && (
                  <span style={{ backgroundColor: style.color }} />
                )}
                Color de origen{style.strike ? ' · texto tachado' : ''}
              </small>
            )}
            {f.cell.formula && (
              <small className="source-formula">
                Fórmula original: {f.cell.formula} · resultado guardado
              </small>
            )}
            {clean(f.header) === 'TOTAL A COBRAR' && (
              <small className="source-pending">
                Pendiente de definición · excluido de cálculos
              </small>
            )}
          </div>
        );
      })}
    </dl>
  );
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="source-sheet">
        <SheetHeader>
          <p className="eyebrow">
            {sheet.name} · FILA {record.row}
          </p>
          <SheetTitle>{record.person || record.kind}</SheetTitle>
          {record.situation.labels.length > 0 && (
            <p className="source-pending">
              {record.situation.labels.join(' · ')}.{' '}
              {record.situation.retiredFromCiudad
                ? 'Ya no pertenece a Ciudad de Dios. Los datos de este proyecto son históricos; esto no determina su situación en otros proyectos.'
                : record.situation.noLot
                  ? 'La ubicación mostrada pertenece al historial; no confirma un lote vigente.'
                  : 'Revisar las observaciones con administración antes de gestionar el cobro.'}
            </p>
          )}
          <SheetDescription>
            {record.lot || 'Registro conservado desde el archivo original.'}
          </SheetDescription>
        </SheetHeader>
        <div className="source-sheet-body">
          {error && <p role="alert">{error}</p>}
          <div
            className="source-state"
            style={
              record.situation.paidInFull
                ? { background: '#FF99CC', color: '#172b3a' }
                : undefined
            }
          >
            {record.situation.paidInFull
              ? 'Pagado totalmente · Sin deuda'
              : 'Saldo por validar · Sin cálculo automático'}
          </div>
          {record.correction && (
            <section className="source-group">
              <h3>Datos actualizados</h3>
              <p>Ubicación: {record.lot}</p>
              <p>{record.correction.observation}</p>
              <small>
                Los datos originales se conservan abajo para consultar el
                historial.
              </small>
            </section>
          )}
          {user.role === 'Administrador' && record.correction && (
            <details>
              <summary>Historial de esta corrección</summary>
              <CorrectionHistory id={id} />
            </details>
          )}
          {record.document && (
            <button
              className="secondary-button"
              onClick={() => onRelated(record.document)}
            >
              Buscar este DNI en toda la base
            </button>
          )}
          <Tabs defaultValue="ficha">
            <TabsList className="source-tabs">
              <TabsTrigger value="ficha">Ficha</TabsTrigger>
              <TabsTrigger value="cuotas">Cuotas</TabsTrigger>
              <TabsTrigger value="abonos">Abonos por concepto</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="gestion">Seguimiento</TabsTrigger>
              <TabsTrigger value="origen">Origen completo</TabsTrigger>
            </TabsList>
            <TabsContent value="ficha">
              {groupNames
                .filter((g) => g !== 'Cuotas y aportaciones')
                .map((group) => {
                  const fields = record.fields.filter((f) => f.group === group);
                  return fields.length ? (
                    <section className="source-group" key={group}>
                      <h3>{group}</h3>
                      {renderFields(fields)}
                    </section>
                  ) : null;
                })}
            </TabsContent>
            <TabsContent value="cuotas">
              <p className="excel-caution">
                Valores y referencias anotados en el Excel. No se suman como
                pagos confirmados ni se asignan a otro lote.
              </p>
              {record.fields.some(
                (f) => f.group === 'Cuotas y aportaciones',
              ) ? (
                renderFields(
                  record.fields.filter(
                    (f) => f.group === 'Cuotas y aportaciones',
                  ),
                )
              ) : (
                <p className="secure-content">
                  Esta fila no tiene columnas de cuotas identificadas.
                </p>
              )}
            </TabsContent>
            <TabsContent value="abonos">
              <p className="excel-caution">
                Para registrar o revisar abonos, abre Trabajo diario y la ficha
                confirmada de la persona. All? cada pago se vincula a un lote y
                concepto.
              </p>
            </TabsContent>
            <TabsContent value="documentos">
              <h3>Referencias del Excel</h3>
              {renderFields(
                record.fields.filter(
                  (f) => f.group === 'Documentos y trámites',
                ),
              )}
              <p>
                Las rutas del Excel son referencias. Adjunta el archivo para
                guardarlo en el expediente.
              </p>
              <h3 className="source-group">Archivos del expediente</h3>
              {extras.documents.map((doc) => (
                <a
                  className="document-row"
                  download
                  href={`/api/secure/document?id=${doc.id}`}
                  key={doc.id}
                >
                  <FileText size={20} />
                  <span>
                    {doc.name}
                    <small>
                      {doc.category} · {doc.author}
                    </small>
                  </span>
                  <Download size={18} />
                </a>
              ))}
              {!extras.documents.length && (
                <p>No hay archivos adjuntos todavía.</p>
              )}
              {user.role !== 'Consulta' && (
                <form
                  className="secure-form source-group"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget,
                      f = new FormData(form);
                    f.set('recordId', id);
                    f.set('category', category);
                    setBusy(true);
                    setError('');
                    try {
                      await api('documents', 'POST', f);
                      form.reset();
                      await load();
                    } catch (err) {
                      setError(errorText(err));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Choice
                    label="Tipo de documento"
                    value={category}
                    options={['Contrato', 'Cobranza', 'Otro documento']}
                    onChange={setCategory}
                  />
                  <label>
                    Archivo · PDF o imagen, máximo 10 MB
                    <input
                      type="file"
                      name="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      required
                    />
                  </label>
                  <button className="primary-button" disabled={busy}>
                    {busy ? 'Guardando…' : 'Adjuntar al expediente'}
                  </button>
                </form>
              )}
            </TabsContent>
            <TabsContent value="gestion">
              <p>
                Las correcciones quedan registradas para revisión y no alteran
                el Excel original.
              </p>
              {extras.entries.map((entry) => (
                <article className="source-group" key={entry.id}>
                  <strong>{entry.kind}</strong>
                  <p className="source-note">{entry.body}</p>
                  <small>
                    {entry.author} ·{' '}
                    {new Date(entry.created).toLocaleString('es-PE')}
                  </small>
                </article>
              ))}
              {user.role !== 'Consulta' && (
                <form
                  className="secure-form source-group"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget,
                      f = new FormData(form);
                    setBusy(true);
                    setError('');
                    try {
                      await api('entry', 'POST', {
                        recordId: id,
                        kind,
                        body: f.get('body'),
                      });
                      form.reset();
                      await load();
                    } catch (err) {
                      setError(errorText(err));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Choice
                    label="Tipo de anotación"
                    value={kind}
                    options={['Gestión', 'Corrección pendiente']}
                    onChange={setKind}
                  />
                  <label>
                    Descripción
                    <textarea name="body" rows={5} required maxLength={10000} />
                  </label>
                  <button className="primary-button" disabled={busy}>
                    {busy ? 'Guardando…' : 'Guardar anotación'}
                  </button>
                </form>
              )}
            </TabsContent>
            <TabsContent value="origen">
              <p className="excel-caution">
                {data.sourceName} · {sheet.name} · Fila {record.row}. Se
                conservan valores, coordenadas y fórmulas. Los números de fecha
                y formatos se verifican en el Excel original; los colores no
                asignan estados automáticamente.
              </p>
              {renderFields(record.fields)}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CorrectionHistory({ id }: { id: string }) {
  const [rows, setRows] = useState<
    Array<{
      created: string;
      author: string;
      username: string;
      reason: string;
      before: {
        location: string;
        observation: string;
        paidInFull: boolean;
      } | null;
      after: { location: string; observation: string; paidInFull: boolean };
    }>
  >([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api<typeof rows>(`record-history?id=${encodeURIComponent(id)}`)
      .then((r) => {
        if (active) setRows(r);
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <div>
      {error && <p role="alert">{error}</p>}
      {rows.map((r) => (
        <section key={r.created}>
          <p>
            {r.author} ({r.username}) ·{' '}
            {new Date(r.created).toLocaleString('es-PE')}
          </p>
          <p>{r.reason}</p>
          <p>
            Anterior:{' '}
            {r.before
              ? `${r.before.location} · ${r.before.observation} · ${r.before.paidInFull ? 'Sin deuda' : 'Por revisar'}`
              : 'Datos del Excel original'}
          </p>
          <p>
            Actualizado: {r.after.location} · {r.after.observation} ·{' '}
            {r.after.paidInFull ? 'Sin deuda' : 'Por revisar'}
          </p>
        </section>
      ))}
    </div>
  );
}
