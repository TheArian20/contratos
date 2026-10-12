import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmedSummary, monthReport } from '../lib/reports.ts';
import { tarHeader, sha256, verifyBackup } from '../lib/backup-format.ts';
const state = {
  people: [],
  lots: [],
  accounts: [],
  payments: [],
  documents: [],
  entries: [],
  changes: [],
  sources: [],
  tasks: [],
  installments: [],
};
test('reports exclude unconfirmed opening amounts and voided payments', () => {
  const accounts = [
    { id: 'a', agreed: 10000, opening: 2000, opening_confirmed: 1 },
    { id: 'b', agreed: 9000, opening: 4000, opening_confirmed: 0 },
  ];
  const s = {
    ...state,
    payments: [
      { account_id: 'a', cents: 1000, date: '2026-09-02', void_reason: null },
      {
        account_id: 'a',
        cents: 8000,
        date: '2026-09-03',
        void_reason: 'Anulado',
        void_date: '2026-10-01T01:00:00Z',
      },
      { account_id: 'b', cents: 500, date: '2026-10-02', void_reason: null },
    ],
    documents: [{ created: '2026-10-01T01:00:00Z' }],
  };
  assert.deepEqual(confirmedSummary(accounts, s), {
    balance: 7000,
    unknown: 1,
    confirmed: 1,
    paid: 3500,
  });
  const r = monthReport(s, '2026-09');
  assert.equal(r.collected, 1000);
  assert.equal(r.voided.length, 1);
  assert.equal(r.documents.length, 1);
  assert.throws(() => monthReport(s, '2026-99'));
});
test('backup verifier detects corruption, missing manifests and duplicate paths', async () => {
  const bytes = new TextEncoder().encode('{"test":true}');
  const manifest = {
    format: 'cartera-backup',
    version: 1,
    created: new Date().toISOString(),
    counts: {},
    files: [
      {
        path: 'database.json',
        size: bytes.length,
        sha256: await sha256(bytes),
      },
    ],
  };
  const entry = (name, b) => [
    tarHeader(name, b.length),
    b,
    new Uint8Array((512 - (b.length % 512)) % 512),
  ];
  const m = new TextEncoder().encode(JSON.stringify(manifest));
  const good = new Blob([
    ...entry('database.json', bytes),
    ...entry('manifest.json', m),
    new Uint8Array(1024),
  ]);
  assert.equal((await verifyBackup(good)).files.length, 1);
  const corrupt = new Uint8Array(await good.arrayBuffer());
  corrupt[514] ^= 1;
  await assert.rejects(() => verifyBackup(new Blob([corrupt])), /modificado/);
  await assert.rejects(
    () => verifyBackup(new Blob(entry('database.json', bytes))),
    /confirmación/,
  );
  await assert.rejects(() =>
    verifyBackup(
      new Blob([
        ...entry('database.json', bytes),
        ...entry('database.json', bytes),
        ...entry('manifest.json', m),
        new Uint8Array(1024),
      ]),
    ),
  );
  assert.throws(() => tarHeader('../private', 5));
});
