import test from 'node:test';
import assert from 'node:assert/strict';
import { personGaps, recentVisits } from '../lib/work-ease.ts';

test('recent visits reject malformed storage, keep most recent unique ids and no personal fields', () => {
  assert.deepEqual(recentVisits({}), []);
  const visits = recentVisits([
    null,
    { kind: 'other', id: 'x' },
    { kind: 'person', id: 3 },
    { kind: 'person', id: '1', name: 'Private' },
    { kind: 'person', id: '1' },
    { kind: 'source', id: '1' },
    ...Array.from({ length: 20 }, (_, i) => ({
      kind: 'person',
      id: String(i + 2),
    })),
  ]);
  assert.equal(visits.length, 8);
  assert.deepEqual(visits.slice(0, 2), [
    { kind: 'person', id: '1' },
    { kind: 'source', id: '1' },
  ]);
  assert.ok(visits.every((v) => Object.keys(v).length === 2));
});
const person = { id: 'p', name: 'Test', document: '', phone: '', address: '' };
const state = {
  people: [person],
  lots: [],
  accounts: [],
  sources: [],
  documents: [],
};
test('missing data never classifies people without lots as debtors or invents a lot', () => {
  assert.deepEqual(
    personGaps(person, state).map((g) => g.action),
    ['person', 'person'],
  );
  assert.deepEqual(
    personGaps({ ...person, document: '123', phone: '123' }, state),
    [],
  );
});
test('gaps identify the correct lot and distinguish unknown amounts from confirmed zero', () => {
  const full = {
    ...state,
    lots: [
      { id: 'l', person_id: 'p', name: 'B24', project: 'City', contract: '' },
      { id: 'foreign', person_id: 'other', contract: '' },
    ],
    accounts: [{ lot_id: 'l', agreed: 0, opening_confirmed: 1 }],
    sources: [{ person_id: 'p', record_id: 'r' }],
    documents: [{ record_id: 'r', category: 'Contrato' }],
  };
  const p = { ...person, document: '123', phone: '123' };
  assert.deepEqual(personGaps(p, full), [
    { label: 'Contrato pendiente: City · B24', action: 'lot', lotId: 'l' },
  ]);
  full.accounts[0].agreed = null;
  assert.ok(personGaps(p, full).some((g) => g.action === 'accounts'));
  full.documents[0].record_id = 'someone-else';
  assert.ok(personGaps(p, full).some((g) => g.action === 'documents'));
});
