import test from 'node:test';
import assert from 'node:assert/strict';
import {
  duplicateGroups,
  dailyClosing,
  commitmentStatus,
  localDay,
} from '../lib/daily-operations.ts';
const record = (id, document, project, lot, personId) => ({
  id,
  name: 'Persona ' + id,
  document,
  project,
  lot,
  personId,
});
test('duplicates use complete identity or an exact normalized lot within its project, never name alone', () => {
  const rows = [
    record('a', '12345678', 'Ciudad de Dios', 'B.24AA'),
    record('b', '12345678 / 87654321', 'Ciudad de Dios', 'B-24AA'),
    record('c', '87654321', 'Otro proyecto', 'B24AA'),
    record('d', '1234', 'Ciudad de Dios', 'B24AB'),
  ];
  const groups = duplicateGroups(rows);
  assert.equal(groups.length, 3);
  assert.equal(groups.filter((g) => g.kind === 'Lote').length, 1);
  assert.deepEqual(
    groups.find((g) => g.kind === 'Lote').records.map((r) => r.id),
    ['a', 'b'],
  );
  assert.equal(
    duplicateGroups([record('a', '', 'X', ''), record('b', '', 'X', '')])
      .length,
    0,
  );
});
test('linked source rows and confirmed person do not report themselves as duplicate people', () => {
  assert.deepEqual(
    duplicateGroups([
      record('s', '12345678', 'City', 'B24', 'p'),
      record('l', '12345678', 'City', 'B.24', 'p'),
    ]),
    [],
  );
});
test('commitments can be overdue or attended without implying a payment', () => {
  assert.equal(
    commitmentStatus({ due: '2026-10-15', done: 0 }, '2026-10-16'),
    'Vencido',
  );
  assert.equal(
    commitmentStatus({ due: '2026-10-16', done: 0 }, '2026-10-16'),
    'Para hoy',
  );
  assert.equal(
    commitmentStatus({ due: '2026-10-15', done: 1 }, '2026-10-16'),
    'Atendido',
  );
});
test('daily closing keeps promises, opening balances and voids out of collections and respects local midnight', () => {
  const payment = {
    id: '1',
    account_id: 'a',
    record_id: 'r',
    date: '2026-10-15',
    created: '2026-10-16T04:30:00Z',
    cents: 12345,
    author: 'Gestor',
    concept: 'Agua',
    lot: 'B24',
    reference: 'REC1',
    void_reason: null,
  };
  const state = {
    people: [{ id: 'p', name: 'Persona' }],
    sources: [{ person_id: 'p', record_id: 'r' }],
    lots: [{ id: 'l', person_id: 'p', project: 'City', name: 'B24' }],
    accounts: [
      {
        id: 'a',
        lot_id: 'l',
        agreed: null,
        opening: 999999,
        opening_confirmed: 0,
      },
    ],
    payments: [
      payment,
      {
        ...payment,
        id: '2',
        cents: 5000,
        void_reason: 'Error',
        void_date: '2026-10-16T05:01:00Z',
      },
      {
        ...payment,
        id: '3',
        date: '2026-10-16',
        created: '2026-10-16T05:00:00Z',
        cents: 100,
      },
    ],
    tasks: [
      {
        kind: 'Compromiso de pago',
        due: '2026-10-15',
        amount: 999999,
        done: 0,
      },
    ],
  };
  const report = dailyClosing(state, '2026-10-15');
  assert.equal(report.collected, 12345);
  assert.equal(report.excluded.length, 1);
  assert.equal(report.cancellations.length, 0);
  assert.equal(report.commitments.length, 1);
  assert.equal(report.unconfirmed.length, 1);
  assert.equal(report.byProject[0].cents, 12345);
  const next = dailyClosing(state, '2026-10-16', [], 'registration');
  assert.equal(next.collected, 100);
  assert.equal(next.cancellations.length, 1);
  assert.equal(localDay('2026-10-16T04:59:59Z'), '2026-10-15');
  assert.equal(localDay('invalid'), '');
});
