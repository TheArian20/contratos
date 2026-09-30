import test from 'node:test';
import assert from 'node:assert/strict';
import {
  organizeSheet,
  inspectDataset,
  fieldGroup,
} from '../lib/source-data.ts';
import { paymentInput } from '../lib/concept-payments.ts';
import {
  passwordValid,
  sameOrigin,
  publicUser,
  hashPassword,
  checkPassword,
} from '../lib/security.ts';
const cell = (value) => ({
  value,
  type: typeof value === 'number' ? 'n' : 's',
  style: null,
  formula: null,
});
test('every source cell and row survives grouping, including headings and unnamed rows', () => {
  const source = {
    name: 'AA DATOS',
    state: 'visible',
    merges: [],
    rows: [
      { row: 1, cells: { A1: cell('Observación inicial') } },
      {
        row: 2,
        cells: {
          A2: cell('NOMBRES Y APELLIDOS'),
          B2: cell('DNI'),
          C2: cell('LUZ'),
          D2: cell('TOTAL A COBRAR'),
        },
      },
      {
        row: 3,
        cells: {
          A3: cell('Ejemplo'),
          B3: cell('00123456'),
          C3: cell(0),
          D3: cell(null),
        },
      },
      { row: 7, cells: { C7: cell('Nota sin persona') } },
    ],
  };
  const organized = organizeSheet(source, 0);
  assert.equal(organized.records.length, 4);
  assert.equal(organized.records[2].document, '00123456');
  assert.equal(organized.records[2].fields[2].cell.value, 0);
  assert.equal(organized.records[2].fields[3].cell.value, null);
  assert.equal(organized.records[3].person, '');
  assert.equal(organized.records.flatMap((r) => r.fields).length, 10);
  assert.equal(fieldGroup('LOTE', cell(100)), 'Servicios y conceptos');
  assert.equal(fieldGroup('VIAS', cell(100)), 'Servicios y conceptos');
});
test('import rejects conflicting coordinates and duplicate rows', () => {
  const data = {
    version: 1,
    sourceHash: 'a'.repeat(64),
    sheets: [{ name: 'Ejemplo', rows: [{ row: 3, cells: { A4: cell(0) } }] }],
  };
  assert.throws(() => inspectDataset(data));
  data.sheets[0].rows[0].cells = { A3: cell(0) };
  assert.equal(inspectDataset(data)[0].cells, 1);
  data.sheets[0].rows.push(data.sheets[0].rows[0]);
  assert.throws(() => inspectDataset(data));
});
test('abonos preserve centavos and require a specific concept, lot, receipt and valid date', () => {
  const payment = {
    amount: '123,45',
    concept: 'Agua',
    lot: 'A-01',
    reference: 'REC-1',
    date: '2026-09-01',
  };
  assert.equal(paymentInput(payment).cents, 12345);
  for (const patch of [
    { amount: '-1' },
    { amount: '1.001' },
    { amount: '0' },
    { date: '2026-02-30' },
    { concept: 'Total' },
    { lot: '' },
    { reference: '' },
  ])
    assert.throws(() => paymentInput({ ...payment, ...patch }));
});
test('credentials are hashed, byte-limited and never exposed in user DTOs', async () => {
  assert.equal(passwordValid('demo123'), false);
  assert.equal(passwordValid('12345678'), true);
  assert.equal(passwordValid('Clave123'), true);
  assert.equal(passwordValid('🙂'.repeat(30)), false);
  const hashed = await hashPassword('Una-clave-segura-123');
  assert.notEqual(hashed, 'Una-clave-segura-123');
  assert.equal(await checkPassword('Una-clave-segura-123', hashed), true);
  assert.equal(await checkPassword('Otra-clave-123', hashed), false);
  assert.equal('hash' in publicUser({ id: 'u', hash: hashed }), false);
});
test('write requests require matching origin', () => {
  assert.equal(
    sameOrigin(
      new Request('https://site.example/api', {
        headers: { origin: 'https://evil.example' },
      }),
    ),
    false,
  );
  assert.equal(
    sameOrigin(
      new Request('https://site.example/api', {
        headers: { origin: 'https://site.example' },
      }),
    ),
    true,
  );
  assert.equal(sameOrigin(new Request('https://site.example/api')), false);
});
