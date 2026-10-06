import test from 'node:test';
import assert from 'node:assert/strict';
import { organizeSheet } from '../lib/source-data.ts';
const cell = (value) => ({ value, type: 's', style: null, formula: null });
test('confirmed correction uses stable identity, preserves source and other records', () => {
  const sheet = {
    name: 'AA DATOS',
    state: 'visible',
    merges: [],
    rows: [
      {
        row: 1,
        cells: {
          A1: cell('NOMBRES Y APELLIDOS'),
          B1: cell('UBICACION'),
          C1: cell('OBSERVACIONES'),
        },
      },
      {
        row: 2,
        cells: {
          A2: cell('Persona uno'),
          B2: cell('Anterior'),
          C2: cell('Conservar nota'),
        },
      },
      { row: 3, cells: { A3: cell('Persona dos'), B3: cell('Otro lote') } },
    ],
  };
  const original = JSON.stringify(sheet);
  const data = {
    sourceHash: 'new',
    recordIds: { '0:2': 'old:0:2' },
    sheets: [sheet],
    corrections: {
      'old:0:2': {
        location: 'Nueva',
        observation: 'Nuevo contrato',
        paidInFull: true,
        version: 1,
      },
    },
  };
  const result = organizeSheet(sheet, 0, {}, data).records;
  assert.equal(result[1].lot, 'Nueva');
  assert.equal(result[1].situation.paidInFull, true);
  assert.deepEqual(
    result[1].observations.map((f) => f.cell.value),
    ['Conservar nota', 'Nuevo contrato'],
  );
  assert.equal(result[1].fields[1].cell.value, 'Anterior');
  assert.equal(result[2].lot, 'Otro lote');
  assert.equal(result[2].situation.paidInFull, false);
  assert.equal(JSON.stringify(sheet), original);
  assert.equal(organizeSheet(sheet, 0).records[1].lot, 'Anterior');
});
