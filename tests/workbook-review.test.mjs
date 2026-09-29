import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewSheet, columnName } from '../lib/workbook-review.ts';

test('keeps original row and column coordinates, zeroes and separate lots', () => {
  const sheet = reviewSheet({
    sheet: 'Ejemplo',
    data: [
      [],
      [
        'NOMBRES Y APELLIDOS',
        'DNI',
        'MZ/LTE - CV',
        'MZ/LTE - PL',
        'TOTAL A COBRAR',
      ],
      ['Persona ficticia', '00123456', 'A-1', 'B-2', 0],
      [],
      ['Persona ficticia', '00123456', 'C-1', null, null],
    ],
  });
  assert.deepEqual(
    sheet.rows.map((row) => row.row),
    [3, 5],
  );
  assert.equal(sheet.rows[0].document, '00123456');
  assert.match(sheet.rows[0].lot, /A-1.*B-2/);
  assert.equal(sheet.rows[0].cells[4], 0);
  assert.equal(sheet.rows[1].cells[4], null);
  assert.equal(columnName(26), 'AA');
});

test('unrecognized sheets retain all populated source rows', () => {
  const sheet = reviewSheet({
    sheet: 'Notas',
    data: [[], [], ['Pendiente de clasificar']],
  });
  assert.equal(sheet.recognized, false);
  assert.equal(sheet.rows[0].row, 3);
});
