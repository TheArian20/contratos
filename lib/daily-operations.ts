import type { WorkState, WorkTask } from './work-ledger';
export const contractStatuses = [
  'Por revisar',
  'Pendiente de elaborar',
  'Pendiente de firma',
  'Firmado',
  'Pendiente de documento',
] as const;
export type ContractState = {
  status: string;
  version: number;
  updated?: string;
};
export type DuplicateRecord = {
  id: string;
  personId?: string;
  name: string;
  document: string;
  project: string;
  lot: string;
  sheet?: number;
  row?: number;
};
export const normalizedReference = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
export function duplicateGroups(records: DuplicateRecord[]) {
  const groups = new Map<
    string,
    {
      kind: 'DNI' | 'Lote';
      label: string;
      records: Map<string, DuplicateRecord>;
    }
  >();
  for (const r of records) {
    const docs = r.document
      .split(/[/;,]/)
      .map(normalizedReference)
      .filter(
        (d) =>
          d.length >= 4 &&
          !['SINDNI', 'SINDATO', 'PENDIENTE', 'PORCONFIRMAR'].includes(d),
      );
    const lot = normalizedReference(r.lot),
      project = normalizedReference(r.project);
    const keys: { key: string; kind: 'DNI' | 'Lote'; label: string }[] = [
      ...new Set(docs),
    ].map((doc) => ({ key: 'dni:' + doc, kind: 'DNI', label: doc }));
    if (lot && project)
      keys.push({
        key: `lot:${project}:${lot}`,
        kind: 'Lote',
        label: `${r.project} · ${r.lot}`,
      });
    for (const item of keys) {
      if (!groups.has(item.key))
        groups.set(item.key, {
          kind: item.kind,
          label: item.label,
          records: new Map(),
        });
      groups
        .get(item.key)!
        .records.set(r.personId ? 'person:' + r.personId : r.id, r);
    }
  }
  return [...groups]
    .filter(([, g]) => g.records.size > 1)
    .map(([key, g]) => ({
      key,
      kind: g.kind,
      label: g.label,
      records: [...g.records.values()],
    }));
}
export function commitmentStatus(task: WorkTask, today: string) {
  return task.done
    ? 'Atendido'
    : task.due < today
      ? 'Vencido'
      : task.due === today
        ? 'Para hoy'
        : 'Próximo';
}
export function localDay(timestamp: string) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.valueOf())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export function dailyClosing(
  state: WorkState,
  day: string,
  sources: DuplicateRecord[] = [],
  basis: 'payment' | 'registration' = 'payment',
) {
  const selected = state.payments.filter(
    (p) => (basis === 'payment' ? p.date : localDay(p.created)) === day,
  );
  const active = selected.filter((p) => !p.void_reason),
    excluded = selected.filter((p) => !!p.void_reason);
  const cancellations = state.payments.filter(
    (p) => p.void_date && localDay(p.void_date) === day,
  );
  const rows = active.map((payment) => {
    const account = state.accounts.find((a) => a.id === payment.account_id);
    const lot = state.lots.find((l) => l.id === account?.lot_id);
    const personId =
      lot?.person_id ??
      state.sources.find((s) => s.record_id === payment.record_id)?.person_id;
    const source = sources.find((s) => s.id === payment.record_id);
    return {
      payment,
      person:
        state.people.find((p) => p.id === personId)?.name ??
        source?.name ??
        'Expediente sin ficha vinculada',
      project: lot?.project ?? source?.project ?? 'Proyecto por identificar',
      lot: lot?.name ?? payment.lot,
      unconfirmed:
        !account || account.agreed === null || !account.opening_confirmed,
    };
  });
  const group = (key: (row: (typeof rows)[number]) => string) => {
    const result = new Map<
      string,
      { label: string; count: number; cents: number }
    >();
    for (const row of rows) {
      const label = key(row);
      const value = result.get(label) ?? { label, count: 0, cents: 0 };
      value.count++;
      value.cents += row.payment.cents;
      result.set(label, value);
    }
    return [...result.values()].sort((a, b) =>
      a.label.localeCompare(b.label, 'es'),
    );
  };
  return {
    rows,
    excluded,
    cancellations,
    collected: active.reduce((sum, p) => sum + p.cents, 0),
    byProject: group((r) => r.project),
    byConcept: group((r) => r.payment.concept),
    byCollector: group((r) => r.payment.author),
    unconfirmed: rows.filter((r) => r.unconfirmed),
    commitments: state.tasks.filter(
      (t) => t.kind === 'Compromiso de pago' && t.due === day && !t.done,
    ),
  };
}
