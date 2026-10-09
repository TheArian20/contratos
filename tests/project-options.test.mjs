import test from 'node:test';
import assert from 'node:assert/strict';
import { availableProjects } from '../lib/source-data.ts';
test('project selector follows current projects and excludes guide and withdrawn sheets', () => {
  const data = {
    sheets: [
      { name: 'AA DATOS' },
      { name: 'CIUDAD DE DIOS' },
      { name: 'Hoja1' },
      { name: 'DESCRIPCION DE BASE DE DATOS' },
      { name: 'AA DATOS' },
    ],
  };
  assert.deepEqual(availableProjects(data), ['AA DATOS', 'CIUDAD DE DIOS']);
  assert.ok(availableProjects(null).includes('CASAS ALEMANAS'));
  assert.equal(availableProjects(null).includes('Hoja1'), false);
});
