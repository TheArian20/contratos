'use client';

import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  FileText,
  FolderClosed,
  Search,
  X,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  type Contract,
  dateLabel,
  filterContracts,
  money,
  statuses,
} from '@/lib/collections';
import { Choice, StatusBadge, initials } from './shared';
import type { DetailTab } from './contract-detail';

export function ContractTable({
  contracts,
  query,
  status,
  collectionMode,
  canEdit,
  onQuery,
  onStatus,
  onOpen,
}: {
  contracts: Contract[];
  query: string;
  status: string;
  collectionMode: boolean;
  canEdit: boolean;
  onQuery: (value: string) => void;
  onStatus: (value: string) => void;
  onOpen: (id: string, tab?: DetailTab) => void;
}) {
  const source = collectionMode
    ? contracts.filter((contract) => contract.amount > contract.paid)
    : contracts;
  const filtered = filterContracts(source, query, status);
  return (
    <section className="panel contracts-panel">
      <div className="panel-heading">
        <div>
          <h2>
            {collectionMode ? 'Cartera pendiente' : 'Todos los contratos'}{' '}
            <span className="count">{source.length}</span>
          </h2>
          <p>
            {collectionMode
              ? 'Registra un abono o el resultado de la gestión.'
              : 'Busca por nombre, identificación, lote o contrato.'}
          </p>
        </div>
        <FolderClosed size={21} className="muted-icon" />
      </div>
      <div className="table-tools">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Buscar contratos"
            placeholder="Nombre, identificación, lote o contrato…"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
          />
          {query && (
            <button aria-label="Limpiar búsqueda" onClick={() => onQuery('')}>
              <X size={16} />
            </button>
          )}
        </label>
        <Choice
          label="Filtrar por estado"
          value={status}
          options={['Todos', ...statuses]}
          onChange={onStatus}
        />
      </div>
      <Table className="contract-table">
        <TableHeader>
          <TableRow>
            <TableHead>CLIENTE / CONTRATO</TableHead>
            <TableHead>SALDO PENDIENTE</TableHead>
            <TableHead>VENCIMIENTO</TableHead>
            <TableHead>ESTADO</TableHead>
            <TableHead>
              <span className={collectionMode ? '' : 'sr-only'}>ACCIONES</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((contract, index) => (
            <TableRow key={contract.id}>
              <TableCell>
                <div className="client-cell">
                  <span className={`client-avatar tint-${index % 3}`}>
                    {initials(contract.client)}
                  </span>
                  <div>
                    <button
                      className="client-link"
                      onClick={() => onOpen(contract.id)}
                    >
                      {contract.client}
                    </button>
                    <span className="contract-id">{contract.id}</span>
                    <span className="lot-reference">
                      {contract.lot || 'Lote por asignar'}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="amount-cell">
                {money(contract.amount - contract.paid)}
                <span className="secondary-line">
                  de {money(contract.amount)}
                </span>
                <span className="secondary-line">
                  Pagado: {money(contract.paid)}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={
                    contract.status === 'Vencido' ? 'overdue-date' : ''
                  }
                >
                  {dateLabel(contract.due)}
                </span>
                <span className="secondary-line">{contract.owner}</span>
              </TableCell>
              <TableCell>
                <StatusBadge status={contract.status} />
              </TableCell>
              <TableCell>
                {collectionMode ? (
                  <div className="table-actions">
                    <button
                      className="secondary-button"
                      onClick={() => onOpen(contract.id, 'payments')}
                    >
                      {canEdit ? 'Registrar pago' : 'Ver pagos'}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => onOpen(contract.id, 'notes')}
                    >
                      {canEdit ? 'Gestionar' : 'Ver gestiones'}
                    </button>
                  </div>
                ) : (
                  <div className="table-actions">
                    <button
                      className="text-button document-shortcut"
                      aria-label={`Documentos de ${contract.client}`}
                      onClick={() => onOpen(contract.id, 'documents')}
                    >
                      <FileText size={16} /> Archivos
                      {contract.attachments?.length
                        ? ` (${contract.attachments.length})`
                        : ''}
                    </button>
                    <button
                      className="row-open"
                      aria-label={`Ver contrato ${contract.id}`}
                      onClick={() => onOpen(contract.id)}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filtered.length === 0 && (
        <div className="empty-state">
          <Search size={30} />
          <h3>
            {collectionMode && !source.length
              ? 'No hay saldos pendientes'
              : 'No encontramos contratos'}
          </h3>
          <p>
            {collectionMode && !source.length
              ? 'Todos los contratos de esta vista están pagados.'
              : 'Prueba otro nombre, identificación o estado.'}
          </p>
          {(query || status !== 'Todos') && (
            <button
              className="secondary-button"
              onClick={() => {
                onQuery('');
                onStatus('Todos');
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
      <div className="table-footer">
        <span>
          Mostrando {filtered.length} de {source.length} contratos
        </span>
        <span>Datos de esta sesión</span>
      </div>
    </section>
  );
}

export function Agenda({
  contracts,
  onOpen,
}: {
  contracts: Contract[];
  onOpen: (id: string, tab?: DetailTab) => void;
}) {
  const pending = contracts
    .filter(
      (contract) =>
        contract.status === 'Vencido' || contract.status === 'Acuerdo de pago',
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  return (
    <aside className="right-column">
      <section className="panel priorities">
        <div className="panel-heading">
          <h2>
            <CalendarDays size={19} /> Por gestionar
          </h2>
          <span className="priority-count">{pending.length}</span>
        </div>
        <p className="aside-subtitle">Vencidos y acuerdos de pago.</p>
        {pending.length ? (
          pending.map((contract) => (
            <button
              className="agenda-item"
              key={contract.id}
              onClick={() => onOpen(contract.id, 'notes')}
            >
              <div>
                <strong>{contract.client}</strong>
                <span>
                  {dateLabel(contract.due)} · {contract.status}
                </span>
                <small>Saldo: {money(contract.amount - contract.paid)}</small>
              </div>
              <ArrowRight size={17} />
            </button>
          ))
        ) : (
          <p className="inline-empty">
            No hay gestiones prioritarias pendientes.
          </p>
        )}
      </section>
      <section className="archive-tip">
        <FolderClosed size={24} />
        <h3>Del papel a un solo lugar</h3>
        <p>
          Abre una ficha y entra a Archivos para adjuntar un PDF o una imagen de
          prueba.
        </p>
        <span>Los archivos duran hasta recargar la página.</span>
      </section>
    </aside>
  );
}

export function PortfolioSummary({
  contracts,
  onFilter,
  onOpen,
}: {
  contracts: Contract[];
  onFilter: (status: string) => void;
  onOpen: (id: string, tab?: DetailTab) => void;
}) {
  const total = contracts.reduce((sum, contract) => sum + contract.amount, 0);
  const paid = contracts.reduce((sum, contract) => sum + contract.paid, 0);
  const percentage = total ? Math.round((paid / total) * 100) : 0;
  const recent = contracts
    .flatMap((contract) =>
      (contract.payments ?? []).map((payment) => ({
        ...payment,
        contractId: contract.id,
        client: contract.client,
      })),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="summary-grid">
      <section className="panel summary-panel">
        <h2>Recuperación de cartera</h2>
        <strong className="summary-percentage">{percentage}%</strong>
        <Progress
          value={percentage}
          aria-label="Porcentaje de cartera recaudada"
          className="collection-progress"
        />
        <p>
          {money(paid)} recaudados de {money(total)}
        </p>
        <div className="status-overview">
          {statuses.map((status) => {
            const matches = contracts.filter(
              (contract) => contract.status === status,
            );
            return (
              <button key={status} onClick={() => onFilter(status)}>
                <StatusBadge status={status} />
                <strong>{matches.length}</strong>
                <ArrowRight size={16} />
              </button>
            );
          })}
        </div>
      </section>
      <section className="panel summary-panel">
        <h2>Pagos registrados en esta sesión</h2>
        {recent.length ? (
          recent.slice(0, 8).map((payment) => (
            <button
              className="agenda-item"
              key={payment.id}
              onClick={() => onOpen(payment.contractId, 'payments')}
            >
              <div>
                <strong>{payment.client}</strong>
                <span>{dateLabel(payment.date)}</span>
              </div>
              <strong>{money(payment.amount)}</strong>
              <ArrowRight size={16} />
            </button>
          ))
        ) : (
          <div className="empty-state">
            <CalendarDays size={30} />
            <h3>Tu próximo pago aparecerá aquí</h3>
            <p>Registra un abono desde Cobranzas para ver la actualización.</p>
          </div>
        )}
      </section>
    </div>
  );
}
