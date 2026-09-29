import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addPayment,
  authenticateDemo,
  filterContracts,
  isValidDate,
  validateContract,
  validateUser,
  visibleContracts,
} from '../lib/collections.ts';
import { attachmentMime, validateAttachments } from '../lib/attachments.ts';
import { contractsForPerson, portfolioTotals } from '../lib/collections.ts';

const contract = {
  id: 'EXT-1',
  client: 'María Torres',
  document: 'DEMO-1',
  amount: 1000,
  paid: 200,
  due: '2026-09-28',
  status: 'Vencido',
  owner: 'Laura',
  location: 'A-01',
};
const payment = {
  id: 'PAY-1',
  amount: 300,
  date: '2026-01-10',
  reference: 'Prueba',
  author: 'Laura',
};
const admin = {
  id: 'u1',
  name: 'Admin',
  username: 'admin',
  password: 'demo123',
  role: 'Administrador',
  active: true,
};
const manager = {
  id: 'u2',
  name: 'Laura',
  username: 'laura',
  password: 'demo123',
  role: 'Gestor de cobranza',
  active: true,
};

test('partial payments update both balance and history without mutating the input', () => {
  const result = addPayment(contract, payment);
  assert.equal(result.paid, 500);
  assert.equal(result.status, 'Vencido');
  assert.deepEqual(result.payments, [payment]);
  assert.equal(contract.paid, 200);
  assert.equal(contract.payments, undefined);
});
test('full settlement closes the contract and rejects additional payments', () => {
  const result = addPayment(contract, { ...payment, amount: 800 });
  assert.equal(result.status, 'Finalizado');
  assert.equal(result.amount - result.paid, 0);
  assert.throws(() => addPayment(result, { ...payment, id: 'new', amount: 1 }));
});
test('invalid payments do not change balances: negative, fractional, duplicate, future or overpaid', () => {
  for (const amount of [-1, 0, 1.5, NaN, Infinity, 801])
    assert.throws(() => addPayment(contract, { ...payment, amount }));
  assert.throws(() => addPayment(contract, { ...payment, date: '2099-01-01' }));
  assert.throws(() => addPayment(contract, { ...payment, date: '2026-02-30' }));
  const paid = addPayment(contract, payment);
  assert.throws(() => addPayment(paid, payment), /ya fue registrado/);
  assert.equal(paid.paid, 500);
});
test('editing cannot erase paid debt or mark outstanding balances as settled', () => {
  assert.doesNotThrow(() => validateContract(contract));
  assert.throws(() => validateContract({ ...contract, amount: 199 }));
  assert.throws(() => validateContract({ ...contract, status: 'Finalizado' }));
  assert.throws(() => validateContract({ ...contract, paid: 1000 }));
  assert.throws(() => validateContract({ ...contract, client: ' ' }));
});
test('dates reject invalid calendar days and accept leap dates', () => {
  assert.equal(isValidDate('2024-02-29'), true);
  for (const date of ['2025-02-29', '2026-04-31', '', '28/09/2026'])
    assert.equal(isValidDate(date), false);
});
test('search matches accents, identifier and combined status', () => {
  assert.equal(filterContracts([contract], 'maria', 'Todos').length, 1);
  assert.equal(filterContracts([contract], 'demo-1', 'Vencido').length, 1);
  assert.equal(filterContracts([contract], 'ext-1', 'Al día').length, 0);
});
test('demo login accepts only active accounts with the correct password', () => {
  assert.equal(
    authenticateDemo([admin, manager], ' ADMIN ', 'demo123').id,
    admin.id,
  );
  assert.throws(() => authenticateDemo([admin], 'admin', 'incorrect'));
  assert.throws(() =>
    authenticateDemo([{ ...admin, active: false }], 'admin', 'demo123'),
  );
});
test('user validation prevents duplicate names for login and losing the last administrator', () => {
  assert.throws(() =>
    validateUser({ ...manager, username: 'ADMIN' }, [admin, manager]),
  );
  assert.throws(() =>
    validateUser({ ...admin, active: false }, [admin, manager]),
  );
  assert.throws(() =>
    validateUser({ ...admin, role: 'Consulta' }, [admin, manager]),
  );
  assert.doesNotThrow(() =>
    validateUser({ ...manager, active: false }, [admin, manager]),
  );
});
test('manager sees only assigned contracts while administrator sees the whole demo', () => {
  const other = { ...contract, id: 'EXT-2', owner: 'Otra persona' };
  assert.deepEqual(visibleContracts([contract, other], manager), [contract]);
  assert.equal(visibleContracts([contract, other], admin).length, 2);
});
test('document uploads accept supported formats and reject disguised executable content', () => {
  assert.doesNotThrow(() =>
    validateAttachments(
      [{ name: 'Contrato.PDF', type: 'application/pdf', size: 123 }],
      0,
    ),
  );
  assert.equal(attachmentMime('Foto.JPG'), 'image/jpeg');
  for (const file of [
    { name: 'malicioso.html', type: 'text/html', size: 100 },
    { name: 'contrato.pdf', type: 'text/html', size: 100 },
    { name: 'vacio.pdf', type: 'application/pdf', size: 0 },
    { name: 'grande.pdf', type: 'application/pdf', size: 10 * 1024 * 1024 + 1 },
  ])
    assert.throws(() => validateAttachments([file], 0));
});
test('document size limit applies to the whole session and rejects a batch atomically', () => {
  assert.throws(() =>
    validateAttachments(
      [{ name: 'nuevo.pdf', type: 'application/pdf', size: 1024 }],
      50 * 1024 * 1024,
    ),
  );
  assert.doesNotThrow(() =>
    validateAttachments([{ name: 'nuevo.pdf', type: '', size: 1024 }], 0),
  );
});

test('one person can have several lot accounts without mixing another identification', () => {
  const first = { ...contract, lot: 'Mz. A - Lote 01' };
  const second = {
    ...contract,
    id: 'EXT-2',
    lot: 'Mz. B - Lote 03',
    amount: 2000,
    paid: 500,
  };
  const otherPerson = {
    ...contract,
    id: 'EXT-3',
    document: 'DEMO-10',
    lot: 'Mz. C - Lote 09',
  };
  const lots = contractsForPerson([first, second, otherPerson], ' demo-1 ');
  assert.deepEqual(
    lots.map((item) => item.id),
    ['EXT-1', 'EXT-2'],
  );
  assert.deepEqual(portfolioTotals(lots), {
    amount: 3000,
    paid: 700,
    pending: 2300,
  });
});

test('a payment changes only its selected lot and the combined total stays consistent', () => {
  const first = { ...contract, lot: 'A-01' };
  const second = {
    ...contract,
    id: 'EXT-2',
    lot: 'A-02',
    amount: 2000,
    paid: 500,
  };
  const updated = addPayment(first, payment);
  assert.equal(updated.lot, 'A-01');
  assert.equal(second.paid, 500);
  assert.equal(second.payments, undefined);
  assert.deepEqual(portfolioTotals([updated, second]), {
    amount: 3000,
    paid: 1000,
    pending: 2000,
  });
});

test('lot search finds its own account and supports records not assigned yet', () => {
  const assigned = { ...contract, lot: 'Mz. B - Lote 03' };
  assert.deepEqual(filterContracts([contract, assigned], 'lote 03', 'Todos'), [
    assigned,
  ]);
  assert.equal(filterContracts([contract], 'undefined', 'Todos').length, 0);
  assert.doesNotThrow(() => validateContract({ ...contract, lot: '' }));
  assert.throws(() => validateContract({ ...contract, lot: 'a'.repeat(81) }));
  assert.deepEqual(portfolioTotals([]), { amount: 0, paid: 0, pending: 0 });
});
