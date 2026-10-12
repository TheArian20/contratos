import { clean } from './source-data.ts';
import type { Person, Lot } from './work-ledger';

export function matchesSearch(query: string, values: unknown[]) {
  const text = clean(values.filter((v) => v != null).join(' '));
  return clean(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}
export function matchesPerson(query: string, person: Person, lots: Lot[]) {
  return matchesSearch(query, [
    person.name,
    person.document,
    person.phone,
    person.project,
    ...lots
      .filter((l) => l.person_id === person.id)
      .flatMap((l) => [l.name, l.project, l.contract]),
  ]);
}
export function sameDocument(left: string, right: string) {
  const normalize = (s: string) => s.replace(/\s+/g, '').toUpperCase();
  const tokens = normalize(left).split(/[/;,]/).filter(Boolean);
  return normalize(right)
    .split(/[/;,]/)
    .filter(Boolean)
    .some((value) => tokens.includes(value));
}
