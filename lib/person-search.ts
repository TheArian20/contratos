import { clean } from './source-data.ts';
import type { Person, Lot } from './work-ledger';

// One insertion, deletion, substitution or adjacent transposition in a name.
function oneLetterApart(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return true;
  if (a.length < b.length) return a.slice(i) === b.slice(i + 1);
  if (a.length > b.length) return a.slice(i + 1) === b.slice(i);
  return (
    a.slice(i + 1) === b.slice(i + 1) ||
    (a[i] === b[i + 1] &&
      a[i + 1] === b[i] &&
      a.slice(i + 2) === b.slice(i + 2))
  );
}

export function matchesSearch(
  query: string,
  values: unknown[],
  names: string[] = [],
) {
  // Punctuation and spacing vary between handwritten/Excel lot references.
  // Keep each field separate: never form a fictitious lot from adjacent fields.
  const compact = (value: unknown) =>
    clean(String(value ?? '')).replace(/[^\p{L}\p{N}]/gu, '');
  const fields = values.filter((v) => v != null).map(compact);
  const nameWords = names.flatMap(
    (name) => clean(name).match(/\p{L}+/gu) ?? [],
  );
  return clean(query)
    .split(/\s+/)
    .map(compact)
    .filter(Boolean)
    .every(
      (word) =>
        fields.some((field) => field.includes(word)) ||
        (word.length >= 4 &&
          /^\p{L}+$/u.test(word) &&
          nameWords.some(
            (name) => name.length >= 4 && oneLetterApart(word, name),
          )),
    );
}
export function matchesPerson(query: string, person: Person, lots: Lot[]) {
  return matchesSearch(
    query,
    [
      person.name,
      person.document,
      person.phone,
      person.project,
      ...lots
        .filter((l) => l.person_id === person.id)
        .flatMap((l) => [l.name, l.project, l.contract]),
    ],
    [person.name],
  );
}
export function sameDocument(left: string, right: string) {
  const normalize = (s: string) => s.replace(/\s+/g, '').toUpperCase();
  const tokens = normalize(left).split(/[/;,]/).filter(Boolean);
  return normalize(right)
    .split(/[/;,]/)
    .filter(Boolean)
    .some((value) => tokens.includes(value));
}
