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
  payments?: Payment[];
  notes?: CollectionNote[];
  attachments?: Attachment[];
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  reference: string;
  author: string;
}
export interface CollectionNote {
  id: string;
  text: string;
  date: string;
  author: string;
}
export type DocumentCategory = 'Contrato' | 'Cobranza' | 'Otro documento';
export const documentCategories: DocumentCategory[] = [
  'Contrato',
  'Cobranza',
  'Otro documento',
];
export interface Attachment {
  id: string;
  name: string;
  size: number;
  url: string;
  category: DocumentCategory;
}
export type UserRole = 'Administrador' | 'Gestor de cobranza' | 'Consulta';
export interface DemoUser {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  active: boolean;
}
export const roles: UserRole[] = [
  'Administrador',
  'Gestor de cobranza',
  'Consulta',
];
export const today = () => new Date().toISOString().slice(0, 10);
export const textField = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
};
export function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value >= '2000-01-01' &&
    value <= '2100-12-31'
  );
}
export function validateContract(contract: Contract) {
  if (!contract.client.trim() || !contract.document.trim())
    throw new Error('Completa el nombre y la identificación del cliente.');
  if (
    !Number.isSafeInteger(contract.amount) ||
    contract.amount <= 0 ||
    contract.amount > 999999999999
  )
    throw new Error('El valor debe ser un número entero positivo en pesos.');
  if (contract.amount < contract.paid)
    throw new Error(
      'El valor del contrato no puede ser menor que los abonos registrados.',
    );
  if (!isValidDate(contract.due))
    throw new Error('La fecha de compromiso no es válida.');
  if (!contract.owner.trim()) throw new Error('Selecciona un responsable.');
  if (!statuses.includes(contract.status))
    throw new Error('El estado del contrato no es válido.');
  if (contract.status === 'Finalizado' && contract.amount !== contract.paid)
    throw new Error('Para finalizar el contrato, el saldo debe ser cero.');
  if (contract.paid === contract.amount && contract.status !== 'Finalizado')
    throw new Error(
      'Un contrato sin saldo debe conservar el estado Finalizado.',
    );
}
export function addPayment(contract: Contract, payment: Payment): Contract {
  if (!Number.isSafeInteger(payment.amount) || payment.amount <= 0)
    throw new Error('Ingresa un abono mayor que cero, sin decimales.');
  if (payment.amount > contract.amount - contract.paid)
    throw new Error('El abono no puede superar el saldo pendiente.');
  if (!isValidDate(payment.date) || payment.date > today())
    throw new Error('Selecciona una fecha de pago válida, no futura.');
  if ((contract.payments ?? []).some((item) => item.id === payment.id))
    throw new Error('Este pago ya fue registrado.');
  const paid = contract.paid + payment.amount;
  return {
    ...contract,
    paid,
    status: paid === contract.amount ? 'Finalizado' : contract.status,
    payments: [...(contract.payments ?? []), payment],
  };
}
export function validateUser(user: DemoUser, users: DemoUser[]) {
  if (!user.name.trim() || !/^[a-z0-9._-]{3,30}$/i.test(user.username))
    throw new Error(
      'Usa un nombre de usuario de 3 a 30 letras, números, puntos o guiones.',
    );
  if (
    users.some(
      (existing) =>
        existing.id !== user.id &&
        existing.username.toLowerCase() === user.username.toLowerCase(),
    )
  )
    throw new Error('Ese nombre de usuario ya existe.');
  if (user.password.length < 6)
    throw new Error(
      'La contraseña de prueba debe tener al menos 6 caracteres.',
    );
  if (!roles.includes(user.role)) throw new Error('Selecciona un rol válido.');
  const remainingAdmins = users.filter(
    (existing) =>
      existing.id !== user.id &&
      existing.active &&
      existing.role === 'Administrador',
  );
  if (
    remainingAdmins.length === 0 &&
    !(user.active && user.role === 'Administrador')
  )
    throw new Error('Debe quedar al menos un administrador activo.');
}
export function authenticateDemo(
  users: DemoUser[],
  username: string,
  password: string,
) {
  const user = users.find(
    (item) =>
      item.active &&
      item.username.toLowerCase() === username.trim().toLowerCase() &&
      item.password === password,
  );
  if (!user)
    throw new Error('Usuario o contraseña incorrectos, o cuenta desactivada.');
  return user;
}
export function visibleContracts(contracts: Contract[], user: DemoUser) {
  return user.role === 'Gestor de cobranza'
    ? contracts.filter((contract) => contract.owner === user.name)
    : contracts;
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
