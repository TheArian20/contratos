import type { Person, WorkState } from './work-ledger';

export type RecentVisit = { kind: 'person' | 'source'; id: string };
export function recentVisits(value: unknown): RecentVisit[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .filter((v): v is RecentVisit => {
      if (
        !v ||
        !['person', 'source'].includes(v.kind) ||
        typeof v.id !== 'string' ||
        !v.id ||
        v.id.length > 300
      )
        return false;
      const key = `${v.kind}:${v.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8)
    .map(({ kind, id }) => ({ kind, id }));
}
export type PersonGap = {
  label: string;
  action: 'person' | 'lot' | 'accounts' | 'documents';
  lotId?: string;
};
export function personGaps(person: Person, state: WorkState): PersonGap[] {
  const gaps: PersonGap[] = [];
  if (!person.document.trim())
    gaps.push({ label: 'DNI / identificación pendiente', action: 'person' });
  if (!person.phone.trim())
    gaps.push({ label: 'Teléfono pendiente', action: 'person' });
  const lots = state.lots.filter((l) => l.person_id === person.id);
  for (const lot of lots) {
    if (!lot.contract.trim())
      gaps.push({
        label: `Contrato pendiente: ${lot.project} · ${lot.name}`,
        action: 'lot',
        lotId: lot.id,
      });
  }
  const ids = new Set(lots.map((l) => l.id));
  const accounts = state.accounts.filter((a) => ids.has(a.lot_id));
  if (accounts.some((a) => a.agreed === null || !a.opening_confirmed))
    gaps.push({
      label: 'Importes por confirmar con Administración',
      action: 'accounts',
    });
  const sources = new Set(
    state.sources
      .filter((s) => s.person_id === person.id)
      .map((s) => s.record_id),
  );
  if (
    lots.length &&
    !state.documents.some(
      (d) => sources.has(d.record_id) && d.category === 'Contrato',
    )
  )
    gaps.push({
      label: 'Contrato sin archivo adjunto en la página',
      action: 'documents',
    });
  return gaps;
}
