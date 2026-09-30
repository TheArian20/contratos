import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileDataset } from '../lib/dataset-update.ts';
import {
  recordKey,
  organizeSheet,
  recordSituation,
} from '../lib/source-data.ts';
const cell = (value) => ({ value, type: 's', formula: null, style: null });
const row = (n, values) => ({
  row: n,
  cells: Object.fromEntries(
    values.map((v, i) => [String.fromCharCode(65 + i) + n, cell(v)]),
  ),
});
const header = row(1, [
  'NOMBRES Y APELLIDOS',
  'DNI',
  'CONTRATO',
  'UBICACION',
  'OBSERVACIONES',
]);
const sheet = (name, rows) => ({
  name,
  state: 'visible',
  merges: [],
  rows: [header, ...rows],
});
const data = (hash, sheets) => ({
  version: 1,
  sourceHash: hash.repeat(64),
  sourceName: 'test.xlsx',
  sheets,
});
test('moved source rows retain document/payment identity despite a new sheet index and changed row', () => {
  const before = data('a', [
    sheet('CIUDAD DE DIOS', [row(3, ['Persona', '001', 'C1', 'A-1', ''])]),
  ]);
  const incoming = data('b', [
    sheet('CIUDAD DE DIOS', []),
    sheet('Hoja1', [row(2, ['Persona', '001', 'C1', 'A-1', 'Retirado'])]),
  ]);
  const result = reconcileDataset(before, incoming);
  assert.equal(result.data.recordIds['1:2'], 'a'.repeat(64) + ':0:3');
  assert.equal(result.summary.moved, 1);
  assert.equal(result.summary.noLot, 1);
  assert.equal(result.summary.changed, 1);
  assert.equal(before.sheets[0].rows[1].cells.E3.value, '');
});
test('ambiguous duplicates and names alone never reassign historical links', () => {
  const before = data('a', [
    sheet('CIUDAD DE DIOS', [
      row(2, ['Persona', '', '', 'A', '']),
      row(3, ['Persona', '', '', 'A', '']),
    ]),
  ]);
  const next = data('b', [
    sheet('CIUDAD DE DIOS', [row(2, ['Persona', '', '', 'B', ''])]),
  ]);
  const result = reconcileDataset(before, next);
  assert.equal(result.data.recordIds['0:2'], undefined);
  assert.ok(result.summary.archivedUnmatched >= 2);
});
test('repeated updates keep the earliest record key and ignore incoming aliases', () => {
  const before = data('a', [
    sheet('CIUDAD DE DIOS', [row(2, ['Persona', '001', 'C1', 'A', ''])]),
  ]);
  const second = data('b', before.sheets);
  const first = reconcileDataset(before, second).data;
  const third = { ...data('c', before.sheets), recordIds: { '0:2': 'evil' } };
  const result = reconcileDataset(first, third).data;
  assert.equal(recordKey(result, { id: '0:2' }), 'a'.repeat(64) + ':0:2');
});
test('lot withdrawal, complaint and collection instruction remain independent', () => {
  const situation = recordSituation(
    'Hoja1',
    row(2, ['DENUNCIANTE', 'NO COBRAR']),
    true,
  );
  assert.equal(situation.noLot, true);
  assert.equal(situation.complainant, true);
  assert.equal(situation.noCollect, true);
  const future = recordSituation(
    'CIUDAD DE DIOS',
    row(2, ['ANULADO X GERENCIA - INDICA QUE VA DENUNCIAR']),
    true,
  );
  assert.equal(future.complainant, false);
  assert.equal(future.review, true);
  assert.equal(future.noLot, false);
  assert.deepEqual(
    recordSituation(
      'DESCRIPCION DE BASE DE DATOS',
      row(2, ['DENUNCIANTE']),
      false,
    ).labels,
    [],
  );
  assert.equal(
    recordSituation('AA DATOS', row(2, ['RESOLUCION SIN LOTES']), true).noLot,
    true,
  );
  assert.equal(
    recordSituation('AA DATOS', row(2, ['Persona- DENUNCIATES']), true)
      .complainant,
    true,
  );
});
test('Hoja1 keeps historical locations and raw monetary cells without inferring balances', () => {
  const result = organizeSheet(
    sheet('Hoja1', [row(2, ['Persona', '001', 'C1', 'A-1', 15000])]),
    0,
  );
  assert.equal(result.records[1].lot, 'A-1');
  assert.equal(result.records[1].situation.noLot, true);
  assert.equal(result.records[1].fields[4].cell.value, 15000);
  assert.equal(result.records[0].situation.noLot, false);
});
