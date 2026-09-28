export type ContractStatus =
  | 'Al día'
  | 'Vencido'
  | 'Acuerdo de pago'
  | 'Finalizado';

export interface Contract {
  id: string;
  client: string;
  document: string;
  amount: number;
  paid: number;
  due: string;
  status: ContractStatus;
  owner: string;
  location: string;
}

export const statuses: ContractStatus[] = [
  'Al día',
  'Vencido',
  'Acuerdo de pago',
  'Finalizado',
];
export const money = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
export const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export function filterContracts(
  contracts: Contract[],
  query: string,
  status: string,
) {
  const term = normalize(query.trim());
  return contracts.filter(
    (c) =>
      (status === 'Todos' || c.status === status) &&
      normalize(`${c.client} ${c.document} ${c.id}`).includes(term),
  );
}
