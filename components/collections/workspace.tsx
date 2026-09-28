'use client';

import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  FolderClosed,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { demoContracts } from '@/lib/demo/contracts';
import { useContractTools } from '@/hooks/use-contract-tools';
import {
  type Contract,
  dateLabel,
  filterContracts,
  money,
  statuses,
} from '@/lib/collections';

const navigation = [
  { label: 'Resumen', icon: LayoutDashboard },
  { label: 'Contratos', icon: FolderClosed },
  { label: 'Cobranzas', icon: Wallet },
  { label: 'Usuarios', icon: Users },
];

function Brand() {
  return (
    <div className="brand">
      <span className="brand-symbol">
        <BriefcaseBusiness size={23} />
      </span>
      <div>
        Cartera<span>CONTRATOS Y COBRANZAS</span>
      </div>
    </div>
  );
}

function Navigation({
  view,
  onNavigate,
  onAccess,
}: {
  view: string;
  onNavigate: (view: string) => void;
  onAccess: () => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar className="app-sidebar">
      <SidebarHeader>
        <Brand />
      </SidebarHeader>
      <SidebarContent>
        <p className="nav-caption">ESPACIO DE TRABAJO</p>
        <SidebarMenu>
          {navigation.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                isActive={view === item.label}
                onClick={() => {
                  onNavigate(item.label);
                  setOpenMobile(false);
                }}
              >
                <item.icon size={19} />
                <span>{item.label}</span>
                {item.label === 'Contratos' && <span className="nav-dot" />}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <div className="sidebar-note">
          <ShieldCheck size={23} />
          <strong>Todo en su lugar</strong>
          <p>Tu cartera y cada contrato, en un mismo espacio.</p>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <button className="profile" onClick={onAccess}>
          <span className="avatar">AD</span>
          <span>
            <strong>Administrador</strong>
            <small>Cuenta de demostración</small>
          </span>
          <LogOut size={17} />
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function CollectionsWorkspace() {
  const [view, setView] = useState('Contratos');
  const [contracts, setContracts] = useState<Contract[]>(demoContracts);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [selected, setSelected] = useState<Contract | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const filtered = filterContracts(contracts, query, status);
  const pending = contracts.reduce((sum, c) => sum + c.amount - c.paid, 0);
  const collected = contracts.reduce((sum, c) => sum + c.paid, 0);
  const overdue = contracts.filter((c) => c.status === 'Vencido');
  const active = contracts.filter((c) => c.status !== 'Finalizado');
  const navigate = (next: string) => {
    setView(next);
    setQuery('');
    setStatus('Todos');
  };
  useContractTools(contracts, (nextQuery, nextStatus) => {
    setView('Contratos');
    setQuery(nextQuery);
    setStatus(nextStatus);
  });

  return (
    <SidebarProvider>
      <Navigation
        view={view}
        onNavigate={navigate}
        onAccess={() => setAccessOpen(true)}
      />
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger className="mobile-menu" />
            <span>Mi espacio</span>
            <ChevronRight size={15} />
            <strong>{view}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-tag">
              <span /> Versión de prueba
            </span>
            <button
              className="help-button"
              aria-label="Información de esta versión"
              onClick={() =>
                setNotice(
                  'Esta es una interfaz con datos ficticios. Los cambios de prueba se reinician al recargar. Las cuentas reales y los documentos se conectarán en una siguiente etapa.',
                )
              }
            >
              <CircleHelp size={20} />
            </button>
            <span className="avatar small">AD</span>
          </div>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">GESTIÓN EXTRAJUDICIAL</p>
              <h1>
                {view === 'Resumen'
                  ? 'Tu cartera, de un vistazo'
                  : view === 'Contratos'
                    ? 'Contratos'
                    : view === 'Cobranzas'
                      ? 'Seguimiento de cobranzas'
                      : 'Tu equipo de trabajo'}
              </h1>
              <p className="subtitle">
                {view === 'Usuarios'
                  ? 'Un espacio para cada persona y sus responsabilidades.'
                  : 'Organiza, consulta y da seguimiento a cada compromiso.'}
              </p>
            </div>
            {view !== 'Usuarios' && (
              <button
                className="primary-button"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={18} /> Nuevo contrato
              </button>
            )}
          </div>
          <div className="demo-banner">
            <span>
              <span className="demo-indicator" /> Vista de demostración{' '}
              <span className="banner-detail">
                · Datos ficticios para diseñar tu sistema
              </span>
            </span>
            <span className="currency-label">Valores en COP</span>
          </div>
          {notice && (
            <output className="notice">
              <span>{notice}</span>
              <button aria-label="Cerrar aviso" onClick={() => setNotice('')}>
                <X size={18} />
              </button>
            </output>
          )}
          {view !== 'Usuarios' && (
            <section className="metrics" aria-label="Resumen de cartera">
              <Metric
                title="Saldo por cobrar"
                value={money(pending)}
                caption="Cartera pendiente total"
                icon={<Wallet size={21} />}
              />
              <Metric
                title="Contratos activos"
                value={String(active.length).padStart(2, '0')}
                caption={`${contracts.length} contratos registrados`}
                icon={<FileText size={21} />}
              />
              <Metric
                title="Contratos vencidos"
                value={String(overdue.length).padStart(2, '0')}
                caption={`${money(overdue.reduce((sum, c) => sum + c.amount - c.paid, 0))} por gestionar`}
                icon={<Clock3 size={21} />}
                warning
              />
              <Metric
                title="Total recaudado"
                value={money(collected)}
                caption="Abonos de los contratos de ejemplo"
                icon={<ArrowDownLeft size={21} />}
              />
            </section>
          )}
          {view === 'Usuarios' ? (
            <section className="panel users-panel">
              <div className="panel-heading">
                <div>
                  <h2>Usuarios y permisos</h2>
                  <p>Propuesta inicial de roles</p>
                </div>
                <ShieldCheck size={23} />
              </div>
              <div className="role-grid">
                {[
                  {
                    title: 'Administrador',
                    text: 'Organiza los contratos, administra el equipo y consulta toda la cartera.',
                    initials: 'AD',
                  },
                  {
                    title: 'Gestor de cobranza',
                    text: 'Consulta sus contratos asignados y registra el seguimiento de cada caso.',
                    initials: 'GC',
                  },
                  {
                    title: 'Consulta',
                    text: 'Revisa los contratos y los saldos autorizados para su usuario.',
                    initials: 'CO',
                  },
                ].map((role) => (
                  <article className="role-card" key={role.title}>
                    <span className="avatar">{role.initials}</span>
                    <h3>{role.title}</h3>
                    <p>{role.text}</p>
                    <span className="role-label">Rol propuesto</span>
                  </article>
                ))}
              </div>
              <div className="account-note">
                <LockKeyhole />
                <div>
                  <strong>Acceso individual con usuario y contraseña</strong>
                  <p>
                    Las cuentas y los permisos reales se configurarán en la
                    siguiente etapa.
                  </p>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => setAccessOpen(true)}
                >
                  Ver pantalla de acceso <ArrowRight size={16} />
                </button>
              </div>
            </section>
          ) : (
            <div className="content-grid">
              <section className="panel contracts-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      {view === 'Cobranzas'
                        ? 'Compromisos y saldos'
                        : view === 'Resumen'
                          ? 'Estado de los contratos'
                          : 'Todos los contratos'}{' '}
                      <span className="count">{contracts.length}</span>
                    </h2>
                    <p>
                      {view === 'Cobranzas'
                        ? 'Consulta cada caso para continuar su seguimiento.'
                        : 'Encuentra el contrato que necesitas en segundos.'}
                    </p>
                  </div>
                  <FolderClosed size={21} className="muted-icon" />
                </div>
                <div className="table-tools">
                  <label className="search-field">
                    <Search size={18} />
                    <input
                      aria-label="Buscar contratos"
                      placeholder="Buscar por nombre, identificación o contrato…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        aria-label="Limpiar búsqueda"
                        onClick={() => setQuery('')}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value ?? 'Todos')}
                  >
                    <SelectTrigger
                      className="status-select"
                      aria-label="Filtrar por estado"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Todos', ...statuses].map((value) => (
                        <SelectItem key={value} value={value}>
                          {value === 'Todos' ? 'Todos los estados' : value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Table className="contract-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>CLIENTE / CONTRATO</TableHead>
                      <TableHead>SALDO PENDIENTE</TableHead>
                      <TableHead>VENCIMIENTO</TableHead>
                      <TableHead>ESTADO</TableHead>
                      <TableHead>
                        <span className="sr-only">Ver contrato</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c, index) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="client-cell">
                            <span className={`client-avatar tint-${index % 3}`}>
                              {c.client
                                .split(' ')
                                .map((part) => part[0])
                                .slice(0, 2)
                                .join('')}
                            </span>
                            <div>
                              <button
                                className="client-link"
                                onClick={() => setSelected(c)}
                              >
                                {c.client}
                              </button>
                              <span className="contract-id">{c.id}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="amount-cell">
                          {money(c.amount - c.paid)}
                          <span className="secondary-line">
                            de {money(c.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              c.status === 'Vencido' ? 'overdue-date' : ''
                            }
                          >
                            {dateLabel(c.due)}
                          </span>
                          <span className="secondary-line">
                            {c.status === 'Finalizado'
                              ? 'Contrato cerrado'
                              : c.status === 'Vencido'
                                ? 'Requiere seguimiento'
                                : 'Próximo compromiso'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                        <TableCell>
                          <button
                            className="row-open"
                            aria-label={`Ver contrato ${c.id}`}
                            onClick={() => setSelected(c)}
                          >
                            <ArrowUpRight size={18} />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filtered.length === 0 && (
                  <div className="empty-state">
                    <Search size={30} />
                    <h3>No encontramos contratos</h3>
                    <p>Prueba otro nombre, identificación o estado.</p>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setQuery('');
                        setStatus('Todos');
                      }}
                    >
                      Limpiar filtros
                    </button>
                  </div>
                )}
                <div className="table-footer">
                  <span>
                    Mostrando {filtered.length} de {contracts.length} contratos
                  </span>
                  <span>Registros de ejemplo</span>
                </div>
              </section>
              <aside className="right-column">
                <section className="panel priorities">
                  <div className="panel-heading">
                    <h2>
                      <CalendarDays size={19} /> Por gestionar
                    </h2>
                    <span className="priority-count">
                      {overdue.length +
                        contracts.filter((c) => c.status === 'Acuerdo de pago')
                          .length}
                    </span>
                  </div>
                  <p className="aside-subtitle">
                    Tu siguiente paso, más claro.
                  </p>
                  <div className="agenda-label">
                    <span className="red-dot" /> ATENCIÓN PRIORITARIA
                  </div>
                  {overdue.map((c) => (
                    <button
                      className="agenda-item"
                      key={c.id}
                      onClick={() => setSelected(c)}
                    >
                      <div>
                        <strong>{c.client}</strong>
                        <span>Revisar compromiso vencido</span>
                        <small>{c.id}</small>
                      </div>
                      <ChevronRight size={17} />
                    </button>
                  ))}
                  <div className="agenda-label upcoming-label">
                    <span className="green-dot" /> ACUERDOS DE PAGO
                  </div>
                  {contracts
                    .filter((c) => c.status === 'Acuerdo de pago')
                    .map((c) => (
                      <button
                        className="agenda-item"
                        key={c.id}
                        onClick={() => setSelected(c)}
                      >
                        <div>
                          <strong>{c.client}</strong>
                          <span>{dateLabel(c.due)}</span>
                          <small>Saldo: {money(c.amount - c.paid)}</small>
                        </div>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                </section>
                <section className="archive-tip">
                  <span className="archive-icon">
                    <FolderClosed size={24} />
                  </span>
                  <h3>Del papel a un solo lugar</h3>
                  <p>
                    Consulta la ubicación física de cada contrato desde su
                    ficha.
                  </p>
                  <span>
                    El archivo digital será el siguiente paso{' '}
                    <ArrowRight size={16} />
                  </span>
                </section>
              </aside>
            </div>
          )}
          <footer className="page-footer">
            <span>
              <ShieldCheck size={15} /> Cartera · Gestión de contratos
              extrajudiciales
            </span>
            <span>Primera versión de la interfaz</span>
          </footer>
        </main>
      </div>
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="contract-sheet">
          {selected && (
            <>
              <SheetHeader>
                <p className="eyebrow">FICHA DEL CONTRATO</p>
                <SheetTitle>{selected.client}</SheetTitle>
                <SheetDescription>
                  {selected.id} · Registro de demostración
                </SheetDescription>
              </SheetHeader>
              <div className="sheet-body">
                <StatusBadge status={selected.status} />
                <div className="balance-block">
                  <span>Saldo pendiente</span>
                  <strong>{money(selected.amount - selected.paid)}</strong>
                  <p>Valor del contrato: {money(selected.amount)}</p>
                </div>
                <Tabs defaultValue="general">
                  <TabsList className="detail-tabs">
                    <TabsTrigger value="general">Información</TabsTrigger>
                    <TabsTrigger value="payments">Pagos</TabsTrigger>
                    <TabsTrigger value="documents">Documentos</TabsTrigger>
                  </TabsList>
                  <TabsContent value="general">
                    <dl className="detail-list">
                      <div>
                        <dt>Identificación</dt>
                        <dd>{selected.document}</dd>
                      </div>
                      <div>
                        <dt>Responsable</dt>
                        <dd>{selected.owner}</dd>
                      </div>
                      <div>
                        <dt>Fecha de compromiso</dt>
                        <dd>{dateLabel(selected.due)}</dd>
                      </div>
                      <div>
                        <dt>Ubicación en papel</dt>
                        <dd>{selected.location}</dd>
                      </div>
                    </dl>
                    <div className="detail-callout">
                      <CalendarDays size={20} />
                      <p>
                        {selected.status === 'Finalizado'
                          ? 'Este contrato de ejemplo no tiene saldo pendiente.'
                          : 'Revisa el compromiso de pago y consulta el archivo físico antes de continuar la gestión.'}
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="payments">
                    <dl className="detail-list">
                      <div>
                        <dt>Valor inicial</dt>
                        <dd>{money(selected.amount)}</dd>
                      </div>
                      <div>
                        <dt>Abonos acumulados</dt>
                        <dd>{money(selected.paid)}</dd>
                      </div>
                      <div>
                        <dt>Saldo actual</dt>
                        <dd>{money(selected.amount - selected.paid)}</dd>
                      </div>
                    </dl>
                    <p className="detail-callout">
                      El registro de pagos y su historial se habilitarán cuando
                      conectemos los datos reales.
                    </p>
                  </TabsContent>
                  <TabsContent value="documents">
                    <div className="empty-state">
                      <FileText size={34} />
                      <h3>Aún no hay documentos</h3>
                      <p>
                        En la siguiente etapa podrás adjuntar el contrato
                        escaneado.
                      </p>
                    </div>
                    <p className="detail-callout">
                      Archivo físico: {selected.location}
                    </p>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="create-dialog">
          <DialogHeader>
            <DialogTitle>Nuevo contrato de prueba</DialogTitle>
            <DialogDescription>
              Explora el registro. Los datos se reinician al recargar.
            </DialogDescription>
          </DialogHeader>
          <form
            className="contract-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const textField = (name: string) => {
                const value = form.get(name);
                return typeof value === 'string' ? value.trim() : '';
              };
              const c: Contract = {
                id: `EXT-2026-${String(contracts.length + 1).padStart(3, '0')}`,
                client: textField('client'),
                document: textField('document'),
                amount: Number(form.get('amount')),
                paid: 0,
                due: textField('due'),
                status: 'Al día',
                owner: 'Administrador',
                location: textField('location') || 'Por asignar',
              };
              if (
                !c.client ||
                !c.document ||
                !Number.isFinite(c.amount) ||
                c.amount <= 0
              )
                return;
              setContracts((previous) => [...previous, c]);
              setCreateOpen(false);
              setQuery('');
              setStatus('Todos');
              setNotice(
                `Contrato ${c.id} agregado a esta demostración. No se guardará al recargar.`,
              );
            }}
          >
            <label htmlFor="client">
              Nombre del cliente
              <Input
                id="client"
                name="client"
                placeholder="Nombre y apellido de ejemplo"
                required
                maxLength={90}
              />
            </label>
            <label htmlFor="document">
              Identificación
              <Input
                id="document"
                name="document"
                placeholder="Identificación de ejemplo"
                required
                maxLength={30}
              />
            </label>
            <div className="form-two">
              <label htmlFor="amount">
                Valor del contrato (COP)
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="1"
                  max="999999999999"
                  step="1"
                  placeholder="0"
                  required
                />
              </label>
              <label htmlFor="due">
                Fecha de compromiso
                <Input
                  id="due"
                  name="due"
                  type="date"
                  required
                  min="2000-01-01"
                  max="2100-12-31"
                />
              </label>
            </div>
            <label htmlFor="location">
              Ubicación del archivo físico
              <Input
                id="location"
                name="location"
                placeholder="Ej. Archivador A · Carpeta 04"
                maxLength={100}
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setCreateOpen(false)}
              >
                Cancelar
              </button>
              <button type="submit" className="primary-button">
                <Check size={17} /> Agregar a la prueba
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={accessOpen} onOpenChange={setAccessOpen}>
        <DialogContent className="access-dialog">
          <Brand />
          <DialogHeader>
            <DialogTitle>Bienvenido a tu espacio</DialogTitle>
            <DialogDescription>
              Pantalla de acceso de demostración
            </DialogDescription>
          </DialogHeader>
          <div className="access-fields">
            <label htmlFor="demo-user">
              Usuario
              <Input
                id="demo-user"
                autoComplete="off"
                placeholder="Tu nombre de usuario"
                disabled
              />
            </label>
            <label htmlFor="demo-password">
              Contraseña
              <Input
                id="demo-password"
                type="password"
                autoComplete="off"
                placeholder="Tu contraseña"
                disabled
              />
            </label>
          </div>
          <button
            className="primary-button"
            onClick={() => setAccessOpen(false)}
          >
            Explorar la demostración <ArrowRight size={17} />
          </button>
          <p className="access-note">
            <LockKeyhole size={17} /> Los usuarios y contraseñas reales aún no
            están habilitados.
          </p>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

function Metric({
  title,
  value,
  caption,
  icon,
  warning = false,
}: {
  title: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <article className={`metric ${warning ? 'warning' : ''}`}>
      <div className="metric-top">
        <span>{title}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <p>
        {warning && <span className="red-dot" />}
        {caption}
      </p>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    'Al día': 'current',
    Vencido: 'late',
    'Acuerdo de pago': 'agreement',
    Finalizado: 'closed',
  };
  return (
    <span className={`status-badge ${tones[status]}`}>
      <span />
      {status}
    </span>
  );
}
