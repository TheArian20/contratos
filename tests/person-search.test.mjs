import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchesPerson,
  matchesSearch,
  sameDocument,
} from '../lib/person-search.ts';
import { colorMeaning } from '../lib/record-colors.ts';

test('names tolerate one missing, extra, replaced or transposed letter', () => {
  const name = 'ELVIS FENANDEZ CARRASCO';
  assert.ok(matchesSearch('elvis fernandez carrasco', [name], [name]));
  for (const query of ['Fernndez', 'Fernanndez', 'Fernandes', 'Fernadnez']) {
    assert.ok(matchesSearch(query, ['Fernández'], ['Fernández']), query);
  }
  assert.ok(matchesSearch('carrasco elvis fernandez', [name], [name]));
  assert.equal(matchesSearch('elvis gonzalez carrasco', [name], [name]), false);
  assert.equal(matchesSearch('ana', ['Eva'], ['Eva']), false);
});

test('name tolerance cannot change DNI, lot, project or contract matches', () => {
  const fields = ['Elvis Fernandez', '12345678', 'B-24AA', 'CASAS', 'ABCD'];
  for (const query of ['12345679', 'B25AA', 'CASOS', 'ABCE', 'elvis 12345679'])
    assert.equal(
      matchesSearch(query, fields, ['Elvis Fernandez']),
      false,
      query,
    );
  assert.ok(matchesSearch('elivs B24AA', fields, ['Elvis Fernandez']));
  assert.equal(matchesSearch('fernandez', ['FENANDEZ']), false);
});

test('partial names work from one letter and ignore accents and repeated spaces', () => {
  for (const query of [
    'm',
    'ma',
    'mar',
    'maria',
    'perez  maria',
    '  María   Pé  ',
  ]) {
    assert.ok(matchesSearch(query, ['María   Pérez']), query);
  }
  assert.equal(matchesSearch('z', ['María Pérez']), true);
  assert.equal(matchesSearch('x', ['María Pérez']), false);
});
test('lot punctuation and spacing do not hide matching records', () => {
  for (const value of ['B.24AA', 'B-24AA', 'B 24 AA', 'B–24AA', 'B. 24AA']) {
    for (const query of ['B24AA', 'B.24AA', 'B-24AA', 'B 24 AA', '24AA']) {
      assert.ok(matchesSearch(query, [value]), `${query} / ${value}`);
    }
  }
  assert.equal(matchesSearch('B25AA', ['B.24AA']), false);
  assert.equal(matchesSearch('B24AA', ['B', '24AA']), false);
  assert.ok(matchesSearch('maria B24AA', ['María Pérez', 'B.24AA']));
});

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
