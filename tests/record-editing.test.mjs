import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEdit,
  editDifferences,
  recordValues,
} from '../lib/record-editing.ts';
import { organizeSheet } from '../lib/source-data.ts';
const base = {
  name: 'Titular',
  document: '12345678',
  phone: '',
  address: '',
  project: 'Proyecto',
  location: 'B-24AA',
  block: '',
  plot: '',
  contract: '10',
  paidInFull: true,
};
test('managers edit personal details without changing settlement status', () => {
  assert.equal(
    validateEdit({ ...base, name: ' Nuevo nombre ' }, base, false).name,
    'Nuevo nombre',
  );
  assert.throws(
    () => validateEdit({ ...base, paidInFull: false }, base, false),
    /Administración/,
  );
  assert.equal(
    validateEdit({ ...base, paidInFull: false }, base, true).paidInFull,
    false,
  );
  assert.throws(
    () => validateEdit({ ...base, name: ' ' }, base, true),
    /nombre/,
  );
  assert.throws(
    () => validateEdit({ ...base, document: '1'.repeat(81) }, base, true),
    /identificación/,
  );
  assert.throws(
    () => validateEdit({ ...base, phone: 42 }, base, true),
    /Teléfono/,
  );
});
test('review shows only actual changes, including cleared fields and paid state', () => {
  assert.deepEqual(editDifferences(base, base), []);
  const changes = editDifferences(base, {
    ...base,
    document: '',
    paidInFull: false,
  });
  assert.equal(changes.length, 2);
  assert.equal(changes[0].after, 'Sin dato');
  assert.equal(changes[1].before, 'Sin deuda');
});
test('edited identity and appended notes coexist with immutable cells and legacy observation', () => {
  const cell = (value) => ({ value, type: 's', style: null, formula: null });
  const sheet = {
    name: 'Proyecto',
    state: 'visible',
    merges: [],
    rows: [
      {
        row: 1,
        cells: {
          A1: cell('NOMBRES Y APELLIDOS'),
          B1: cell('DNI'),
          C1: cell('OBSERVACION'),
        },
      },
      {
        row: 2,
        cells: {
          A2: cell('Titular original'),
          B2: cell('12345678'),
          C2: cell('Nota original'),
        },
      },
    ],
  };
  const data = {
    sourceHash: 'hash',
    sheets: [sheet],
    corrections: {
      'hash:0:2': {
        ...base,
        name: 'Nombre actualizado',
        notes: ['Nueva nota', 'Otra nota'],
        observation: 'Nota anterior a esta función',
        version: 2,
      },
    },
  };
  const r = organizeSheet(sheet, 0, {}, data).records[1];
  assert.equal(recordValues(r).name, 'Nombre actualizado');
  assert.equal(r.fields[0].cell.value, 'Titular original');
  assert.deepEqual(
    r.observations.map((f) => f.cell.value),
    [
      'Nota original',
      'Nota anterior a esta función',
      'Nueva nota',
      'Otra nota',
    ],
  );
  assert.equal(r.situation.paidInFull, true);
  assert.equal(r.lot, 'B-24AA');
  assert.equal(r.block, '');
});
