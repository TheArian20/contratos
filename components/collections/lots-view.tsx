'use client';

import { useState } from 'react';
import { FileText, MapPinned, Search, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type Contract,
  contractsForPerson,
  filterContracts,
  money,
  portfolioTotals,
  statuses,
} from '@/lib/collections';
import { Choice, StatusBadge } from './shared';
import type { DetailTab } from './contract-detail';

export function LotsView({
  contracts,
  canEdit,
  onOpen,
}: {
  contracts: Contract[];
  canEdit: boolean;
  onOpen: (id: string, tab?: DetailTab) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [assignment, setAssignment] = useState('Todos los registros');
  const [person, setPerson] = useState<{
    name: string;
    document: string;
  } | null>(null);
  const source = person
    ? contractsForPerson(contracts, person.document)
    : contracts;
  const matches = filterContracts(source, query, status).filter(
    (contract) =>
      assignment === 'Todos los registros' ||
      (assignment === 'Con lote'
        ? !!contract.lot?.trim()
        : !contract.lot?.trim()),
  );
  const totals = portfolioTotals(matches);
  const clearFilters = () => {
    setQuery('');
    setStatus('Todos');
    setAssignment('Todos los registros');
    setPerson(null);
  };
  return (
    <section className="panel lots-panel">
      <div className="panel-heading">
        <div>
          <h2>
            Estado de cuenta por lote{' '}
            <span className="count">{matches.length}</span>
          </h2>
          <p>
            Busca una persona para consultar todos sus lotes. Cada fila conserva
            sus propios pagos y documentos.
          </p>
        </div>
        <MapPinned size={23} className="muted-icon" />
      </div>
      <div className="table-tools lot-tools">
        <label className="search-field">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPerson(null);
            }}
            aria-label="Buscar persona o lote"
            placeholder="Persona, identificación, lote o contrato…"
          />
          {query && (
            <button
              aria-label="Limpiar búsqueda de lotes"
              onClick={() => setQuery('')}
            >
              <X size={16} />
            </button>
          )}
        </label>
        <Choice
          label="Estado de pago"
          value={status}
          options={['Todos', ...statuses]}
          onChange={setStatus}
        />
        <Choice
          label="Asignación de lote"
          value={assignment}
          options={['Todos los registros', 'Con lote', 'Por asignar']}
          onChange={setAssignment}
        />
      </div>
      {person && (
        <div className="lot-person-filter">
          <span>
            {person.name} / {person.document}
          </span>
          <button className="text-button" onClick={() => setPerson(null)}>
            Ver todas las personas <X size={14} />
          </button>
        </div>
      )}
      <div
        className="lot-totals"
        aria-label="Totales de los registros mostrados"
      >
        <div>
          <span>Valor total</span>
          <strong>{money(totals.amount)}</strong>
        </div>
        <div>
          <span>Lo que pagaron</span>
          <strong className="paid-total">{money(totals.paid)}</strong>
        </div>
        <div>
          <span>Lo que deben</span>
          <strong>{money(totals.pending)}</strong>
        </div>
        <p>Totales de los {matches.length} registros que se muestran abajo.</p>
      </div>
      <Table className="contract-table lot-table">
        <TableHeader>
          <TableRow>
            <TableHead>PERSONA</TableHead>
            <TableHead>LOTE / CONTRATO</TableHead>
            <TableHead>VALOR TOTAL</TableHead>
            <TableHead>PAGADO</TableHead>
            <TableHead>SALDO PENDIENTE</TableHead>
            <TableHead>ESTADO</TableHead>
            <TableHead>ACCIONES</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((contract) => (
            <TableRow key={contract.id}>
              <TableCell>
                <button
                  className="client-link"
                  onClick={() => {
                    setPerson({
                      name: contract.client,
                      document: contract.document,
                    });
                    setQuery('');
                    setStatus('Todos');
                    setAssignment('Todos los registros');
                  }}
                  title="Ver todos los registros de esta persona"
                >
                  {contract.client}
                </button>
                <span className="secondary-line">{contract.document}</span>
              </TableCell>
              <TableCell>
                <button
                  className="client-link"
                  onClick={() => onOpen(contract.id)}
                >
                  {contract.lot || 'Lote por asignar'}
                </button>
                <span className="contract-id">{contract.id}</span>
              </TableCell>
              <TableCell className="amount-cell">
                {money(contract.amount)}
              </TableCell>
              <TableCell className="amount-cell paid-total">
                {money(contract.paid)}
              </TableCell>
              <TableCell className="amount-cell">
                {money(contract.amount - contract.paid)}
              </TableCell>
              <TableCell>
                <StatusBadge status={contract.status} />
              </TableCell>
              <TableCell>
                <div className="lot-actions">
                  <button
                    className="secondary-button"
                    onClick={() => onOpen(contract.id, 'payments')}
                  >
                    {canEdit && contract.paid < contract.amount
                      ? 'Registrar pago'
                      : 'Ver pagos'}
                  </button>
                  <button
                    className="text-button document-shortcut"
                    onClick={() => onOpen(contract.id, 'documents')}
                    aria-label={`Documentos de ${contract.client}, ${contract.lot || contract.id}`}
                  >
                    <FileText size={16} /> Archivos
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!matches.length && (
        <div className="empty-state">
          <MapPinned size={30} />
          <h3>No hay registros para esta búsqueda</h3>
          <p>Prueba otro nombre, identificación o lote.</p>
          <button className="secondary-button" onClick={clearFilters}>
            Limpiar filtros
          </button>
        </div>
      )}
      <div className="table-footer">
        <span>
          {matches.length} de {contracts.length} registros
        </span>
        <span>Los pagos se aplican únicamente al registro seleccionado.</span>
      </div>
    </section>
  );
}
