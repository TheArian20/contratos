import { accountTotals, type WorkState, type Account } from './work-ledger.ts';
export function confirmedSummary(accounts: Account[], state: WorkState) {
  const totals = accounts.map((a) => ({
    a,
    ...accountTotals(a, state.payments),
  }));
  return {
    balance: totals
      .filter((t) => t.balance !== null)
      .reduce((n, t) => n + t.balance!, 0),
    unknown: totals.filter((t) => t.balance === null).length,
    confirmed: totals.filter((t) => t.balance !== null).length,
    paid: totals.reduce(
      (n, t) => n + t.newPaid + (t.a.opening_confirmed ? t.a.opening : 0),
      0,
    ),
  };
}
export function monthReport(state: WorkState, month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new Error('Selecciona un mes válido.');
  const inMonth = (date: string) => date.slice(0, 7) === month;
  const localMonth = (date: string) => {
    const d = new Date(date);
    return Number.isNaN(d.valueOf())
      ? ''
      : new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Lima',
          year: 'numeric',
          month: '2-digit',
        })
          .format(d)
          .slice(0, 7);
  };
  const payments = state.payments.filter(
    (p) => inMonth(p.date) && !p.void_reason,
  );
  return {
    payments,
    collected: payments.reduce((n, p) => n + p.cents, 0),
    voided: state.payments.filter(
      (p) => p.void_date && localMonth(p.void_date) === month,
    ),
    people: state.people.filter((p) => localMonth(p.created) === month),
    documents: state.documents.filter((d) => localMonth(d.created) === month),
    entries: state.entries.filter((e) => localMonth(e.created) === month),
    changes: state.changes.filter((c) => localMonth(c.created) === month),
  };
}
