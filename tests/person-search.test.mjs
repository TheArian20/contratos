import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchesPerson,
  matchesSearch,
  sameDocument,
} from '../lib/person-search.ts';
import { colorMeaning } from '../lib/record-colors.ts';

test('search supports accents, reordered words, lots, projects and contracts', () => {
  const person = {
    id: 'one',
    name: 'María Pérez',
    document: '01234567',
    phone: '',
    project: 'CASAS',
  };
  const lots = [
    {
      person_id: 'one',
      name: 'B-24AA',
      project: 'CIUDAD DE DIOS',
      contract: '000183',
    },
    { person_id: 'other', name: 'ZZ-99', project: 'OTRO', contract: '999' },
  ];
  for (const query of [
    'perez maria',
    '01234567',
    'B-24AA',
    '000183',
    'ciudad maria',
    'casas',
  ])
    assert.ok(matchesPerson(query, person, lots));
  assert.equal(matchesPerson('ZZ-99', person, lots), false);
  assert.equal(matchesPerson('maria inexistente', person, lots), false);
  assert.ok(matchesSearch('183 maria', ['María', 'Contrato 000183']));
});
test('DNI warning matches complete identifiers, including joint records, not substrings', () => {
  assert.ok(sameDocument(' 01234567 / 12345678 ', '01234567'));
  assert.ok(sameDocument('ABC 123; X9', 'abc123'));
  assert.equal(sameDocument('12345678', '1234'), false);
  assert.equal(sameDocument('', ''), false);
});
test('color explanations keep pink debt meaning scoped to Ciudad de Dios', () => {
  assert.equal(colorMeaning('pink', 'CIUDAD DE DIOS'), 'Sin deuda');
  assert.match(colorMeaning('pink', 'AA DATOS'), /no confirma/);
  assert.match(
    colorMeaning('pink', 'SERVICIOS - CIUDAD DE DIOS'),
    /no confirma/,
  );
  assert.match(colorMeaning('red', 'CASAS'), /denunciante/);
  assert.match(colorMeaning('red', 'CIUDAD DE DIOS'), /anulado/);
  assert.equal(colorMeaning('red', 'AA DATOS'), 'Etiqueta de seguimiento');
});
