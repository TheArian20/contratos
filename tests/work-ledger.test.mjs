import test from 'node:test';
import assert from 'node:assert/strict';
import {
  monthlyPlan,
  centsInput,
  accountTotals,
  installmentBalance,
  validDay,
} from '../lib/work-ledger.ts';
test('monthly installments preserve every cent and clamp calendar month ends', () => {
  const rows = monthlyPlan(10001, 3, '2028-01-31');
  assert.deepEqual(
    rows.map((r) => r.due),
    ['2028-01-31', '2028-02-29', '2028-03-31'],
  );
  assert.equal(
    rows.reduce((n, r) => n + r.cents, 0),
    10001,
  );
  assert.deepEqual(
    rows.map((r) => r.cents),
    [3334, 3334, 3333],
  );
  assert.throws(() => monthlyPlan(100, 0, '2026-01-01'));
  assert.throws(() => monthlyPlan(5, 10, '2026-01-01'));
});
test('unknown balances remain unknown and voids never count as collected money', () => {
  const a = { id: 'a', agreed: null, opening: 100 };
  const p = [
    { account_id: 'a', installment_id: 'i', cents: 20, void_reason: null },
    { account_id: 'a', installment_id: 'i', cents: 30, void_reason: 'Error' },
    { account_id: 'b', cents: 900, void_reason: null },
  ];
  assert.deepEqual(accountTotals(a, p), {
    newPaid: 20,
    paid: 120,
    balance: null,
  });
  assert.equal(accountTotals({ ...a, agreed: 200 }, p).balance, 80);
  assert.equal(
    accountTotals({ ...a, agreed: 200, opening_confirmed: 0 }, p).balance,
    null,
  );
  assert.equal(installmentBalance({ id: 'i', cents: 70 }, p), 50);
});
test('money and dates reject ambiguous or invalid input', () => {
  assert.equal(centsInput('1,25'), 125);
  assert.equal(centsInput('', true), null);
  for (const v of ['-1', '1.111', '1e3', 'Infinity'])
    assert.throws(() => centsInput(v));
  assert.equal(validDay('2026-02-30'), false);
  assert.equal(validDay('2028-02-29'), true);
});
