'use client';

import { useState } from 'react';
import {
  ArrowDownLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  FolderClosed,
  LayoutDashboard,
  MapPinned,
  Plus,
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
import { useContractTools } from '@/hooks/use-contract-tools';
import { useDemoWorkspace } from '@/hooks/use-demo-workspace';
import { type Contract, money, visibleContracts } from '@/lib/collections';
import { ContractForm } from './contract-form';
import { ContractDetail, type DetailTab } from './contract-detail';
import { AccountDialog, LoginScreen, UsersPanel } from './users-panel';
import { Agenda, ContractTable, PortfolioSummary } from './portfolio-views';
import { Brand, initials } from './shared';
import { LotsView } from './lots-view';
import { WorkbookReview } from './workbook-review';

const navigation = [
  { label: 'Resumen', icon: LayoutDashboard },
  { label: 'Contratos', icon: FolderClosed },
  { label: 'Lotes', icon: MapPinned },
  { label: 'Cobranzas', icon: Wallet },
  { label: 'Usuarios', icon: Users },
  { label: 'Revisar Excel', icon: FileText },
];

function Navigation({
  view,
  name,
  role,
  onNavigate,
  onAccess,
}: {
  view: string;
  name: string;
  role: string;
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
                {view === item.label && <span className="nav-dot" />}
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
        <button
          className="profile"
          onClick={onAccess}
          aria-label="Abrir mi sesión"
        >
          <span className="avatar">{initials(name)}</span>
          <span>
            <strong>{name}</strong>
            <small>{role}</small>
          </span>
          <ChevronRight size={17} />
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function CollectionsWorkspace() {
  const demo = useDemoWorkspace();
  const [view, setView] = useState('Contratos');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [selected, setSelected] = useState<{
    id: string;
    tab: DetailTab;
  } | null>(null);
  const [editor, setEditor] = useState<Contract | 'new' | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const contracts = demo.user
    ? visibleContracts(demo.contracts, demo.user)
    : [];
  const selectedContract = contracts.find(
    (contract) => contract.id === selected?.id,
  );
  const canManage = demo.user?.role === 'Administrador';
  const canEdit = !!demo.user && demo.user.role !== 'Consulta';
  const pending = contracts.reduce(
    (sum, contract) => sum + contract.amount - contract.paid,
    0,
  );
  const collected = contracts.reduce((sum, contract) => sum + contract.paid, 0);
  const overdue = contracts.filter((contract) => contract.status === 'Vencido');
  const active = contracts.filter(
    (contract) => contract.status !== 'Finalizado',
  );
  const navigate = (next: string) => {
    setView(next);
    setQuery('');
    setStatus('Todos');
  };
  const open = (id: string, tab: DetailTab = 'general') =>
    setSelected({ id, tab });
  useContractTools(contracts, (nextQuery, nextStatus) => {
    setView('Contratos');
    setQuery(nextQuery);
    setStatus(nextStatus);
  });
  if (!demo.user)
    return (
      <LoginScreen
        onLogin={(username, password) => {
          demo.login(username, password);
          navigate('Resumen');
          setNotice('Sesión de prueba iniciada.');
        }}
      />
    );

  return (
    <SidebarProvider>
      <Navigation
        view={view}
        name={demo.user.name}
        role={demo.user.role}
        onNavigate={navigate}
        onAccess={() => setAccountOpen(true)}
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
                  'Puedes crear contratos, registrar pagos y gestiones, adjuntar documentos y probar usuarios. Todo permanece solo en esta pestaña hasta recargarla. Para cambiar de usuario, abre tu sesión y pulsa Cerrar sesión.',
                )
              }
            >
              <CircleHelp size={20} />
            </button>
            <button
              className="avatar small"
              onClick={() => setAccountOpen(true)}
              aria-label="Ver mi cuenta"
            >
              {initials(demo.user.name)}
            </button>
          </div>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">GESTIÓN EXTRAJUDICIAL</p>
              <h1>
                {view === 'Revisar Excel'
                  ? 'Tu base de datos'
                  : view === 'Resumen'
                    ? 'Tu cartera, de un vistazo'
                    : view === 'Contratos'
                      ? 'Contratos'
                      : view === 'Cobranzas'
                        ? 'Seguimiento de cobranzas'
                        : view === 'Lotes'
                          ? 'Lotes y saldos'
                          : 'Tu equipo de trabajo'}
              </h1>
              <p className="subtitle">
                {view === 'Usuarios'
                  ? 'Un usuario para cada persona y sus responsabilidades.'
                  : view === 'Lotes'
                    ? 'Cada persona, sus lotes y sus pagos en un solo lugar.'
                    : demo.user.role === 'Gestor de cobranza'
                      ? 'Gestiona los contratos que tienes asignados.'
                      : 'Organiza, consulta y da seguimiento a cada compromiso.'}
              </p>
            </div>
            {view !== 'Usuarios' && view !== 'Revisar Excel' && canManage && (
              <button
                className="primary-button"
                onClick={() => setEditor('new')}
              >
                <Plus size={18} /> Nuevo contrato
              </button>
            )}
          </div>
          <div className="demo-banner">
            <span>
              <span className="demo-indicator" /> Demostración interactiva{' '}
              <span className="banner-detail">
                · Los cambios y archivos se reinician al recargar
              </span>
            </span>
            <span className="currency-label">
              {view === 'Revisar Excel'
                ? 'Importes seg?n el archivo'
                : 'Valores de ejemplo en COP'}
            </span>
          </div>
          {notice && (
            <output className="notice">
              <span>{notice}</span>
              <button aria-label="Cerrar aviso" onClick={() => setNotice('')}>
                <X size={18} />
              </button>
            </output>
          )}
          {view !== 'Usuarios' &&
            view !== 'Lotes' &&
            view !== 'Revisar Excel' && (
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
                  caption={`${contracts.length} contratos visibles`}
                  icon={<FileText size={21} />}
                />
                <Metric
                  title="Contratos vencidos"
                  value={String(overdue.length).padStart(2, '0')}
                  caption={`${money(overdue.reduce((sum, contract) => sum + contract.amount - contract.paid, 0))} por gestionar`}
                  icon={<Clock3 size={21} />}
                  warning
                />
                <Metric
                  title="Total recaudado"
                  value={money(collected)}
                  caption="Incluye los abonos de esta sesión"
                  icon={<ArrowDownLeft size={21} />}
                />
              </section>
            )}
          {view === 'Revisar Excel' ? (
            <WorkbookReview />
          ) : view === 'Usuarios' ? (
            <UsersPanel
              users={demo.users}
              currentUser={demo.user}
              onSave={(user) => {
                demo.saveUser(user);
                setNotice(
                  `Usuario ${user.username} guardado en esta demostración.`,
                );
              }}
              onToggle={(user) => {
                demo.saveUser({ ...user, active: !user.active });
                setNotice(
                  `Usuario ${user.username} ${user.active ? 'desactivado' : 'activado'}.`,
                );
              }}
              onAccount={() => setAccountOpen(true)}
            />
          ) : view === 'Lotes' ? (
            <LotsView contracts={contracts} canEdit={canEdit} onOpen={open} />
          ) : view === 'Resumen' ? (
            <PortfolioSummary
              contracts={contracts}
              onFilter={(value) => {
                setView('Contratos');
                setQuery('');
                setStatus(value);
              }}
              onOpen={open}
            />
          ) : (
            <div
              className={
                view === 'Cobranzas' ? 'collections-layout' : 'content-grid'
              }
            >
              <ContractTable
                contracts={contracts}
                query={query}
                status={status}
                collectionMode={view === 'Cobranzas'}
                canEdit={canEdit}
                onQuery={setQuery}
                onStatus={setStatus}
                onOpen={open}
              />
              {view === 'Contratos' && (
                <Agenda contracts={contracts} onOpen={open} />
              )}
            </div>
          )}
          <footer className="page-footer">
            <span>
              <ShieldCheck size={15} /> Cartera · Gestión de contratos
              extrajudiciales
            </span>
            <span>Demostración pública · Sin datos reales</span>
          </footer>
        </main>
      </div>
      {selected && selectedContract && (
        <ContractDetail
          key={`${selected.id}-${selected.tab}`}
          contract={selectedContract}
          initialTab={selected.tab}
          canEdit={canEdit}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditor(selectedContract);
            setSelected(null);
          }}
          onPay={(payment) => demo.pay(selected.id, payment)}
          onNote={(text) => demo.addNote(selected.id, text)}
          onAttach={(files, category) =>
            demo.attach(selected.id, files, category)
          }
          onRemove={(id) => demo.removeAttachment(selected.id, id)}
        />
      )}
      {editor && (
        <ContractForm
          contract={editor === 'new' ? undefined : editor}
          owners={demo.users
            .filter((user) => user.active && user.role !== 'Consulta')
            .map((user) => user.name)}
          onSave={(contract) => {
            const id = demo.saveContract(contract);
            setNotice(
              `Contrato ${id} ${editor === 'new' ? 'creado' : 'actualizado'}.`,
            );
            navigate(view === 'Lotes' ? 'Lotes' : 'Contratos');
            open(id);
          }}
          onClose={() => setEditor(null)}
        />
      )}
      {accountOpen && (
        <AccountDialog
          user={demo.user}
          onClose={() => setAccountOpen(false)}
          onLogout={() => {
            setAccountOpen(false);
            setSelected(null);
            setEditor(null);
            setNotice('');
            demo.logout();
          }}
        />
      )}
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
