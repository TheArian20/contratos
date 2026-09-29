export type Person = {
  id: string;
  name: string;
  document: string;
  phone: string;
  address: string;
  version: number;
  created: string;
};
export type Lot = {
  id: string;
  person_id: string;
  name: string;
  project: string;
  contract: string;
  version: number;
};
export type Account = {
  id: string;
  lot_id: string;
  concept: string;
  agreed: number | null;
  opening: number;
  opening_confirmed: number;
  opening_date: string;
  evidence: string;
  version: number;
};
export type LedgerPayment = {
  id: string;
  record_id: string;
  account_id: string | null;
  installment_id: string | null;
  concept: string;
  lot: string;
  cents: number;
  date: string;
  reference: string;
  author: string;
  created: string;
  void_reason: string | null;
  void_author: string | null;
  void_date: string | null;
  operation: string | null;
};
export type Installment = {
  id: string;
  account_id: string;
  due: string;
  cents: number;
};
export type WorkTask = {
  id: string;
  person_id: string;
  kind: string;
  description: string;
  due: string;
  amount: number | null;
  done: number;
  version: number;
  author: string;
  created: string;
};
export type WorkState = {
  people: Person[];
  sources: { record_id: string; person_id: string; reason: string }[];
  lots: Lot[];
  accounts: Account[];
  payments: LedgerPayment[];
  installments: Installment[];
  tasks: WorkTask[];
  changes: {
    id: string;
    person_id: string;
    entity: string;
    before: string;
    after: string;
    reason: string;
    author: string;
    created: string;
  }[];
  documents: {
    id: string;
    record_id: string;
    name: string;
    category: string;
    author: string;
    created: string;
  }[];
  entries: {
    id: string;
    record_id: string;
    kind: string;
    body: string;
    author: string;
    created: string;
  }[];
};
export const soles = (cents: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(
    cents / 100,
  );
export function centsInput(value: unknown, nullable = false): number | null {
  if (nullable && (value === '' || value === null || value === undefined))
    return null;
  if (
    typeof value !== 'string' ||
    !/^\d{1,9}([.,]\d{1,2})?$/.test(value.trim())
  )
    throw new Error('Ingresa un importe con hasta dos decimales.');
  const [whole, fraction = ''] = value.trim().replace(',', '.').split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export function validDay(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export const todayLocal = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export function accountTotals(account: Account, payments: LedgerPayment[]) {
  const newPaid = payments
    .filter((p) => p.account_id === account.id && !p.void_reason)
    .reduce((n, p) => n + p.cents, 0);
  const paid = account.opening + newPaid;
  return {
    newPaid,
    paid,
    balance:
      account.agreed === null || account.opening_confirmed === 0
        ? null
        : account.agreed - paid,
  };
}
export function installmentBalance(i: Installment, payments: LedgerPayment[]) {
  return (
    i.cents -
    payments
      .filter((p) => p.installment_id === i.id && !p.void_reason)
      .reduce((n, p) => n + p.cents, 0)
  );
}
export function monthlyPlan(remaining: number, count: number, first: string) {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 120 ||
    remaining < count ||
    !validDay(first)
  )
    throw new Error('Revisa el número de cuotas y la primera fecha.');
  const [year, month, day] = first.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const last = new Date(Date.UTC(year, month + i, 0)).getUTCDate();
    const due = new Date(Date.UTC(year, month - 1 + i, Math.min(day, last)))
      .toISOString()
      .slice(0, 10);
    return {
      due,
      cents: Math.floor(remaining / count) + (i < remaining % count ? 1 : 0),
    };
  });
}
