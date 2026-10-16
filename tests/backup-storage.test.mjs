import test from 'node:test';
import assert from 'node:assert/strict';
import { backupChunks, validBackupId } from '../lib/backup-storage.ts';
test('multipart chunks preserve byte order across arbitrary input boundaries and a short final part', async () => {
  const input = [
    new Uint8Array([1]),
    new Uint8Array([2, 3, 4, 5, 6, 7, 8, 9]),
    new Uint8Array([10, 11]),
  ];
  const stream = new ReadableStream({
    start(c) {
      input.forEach((v) => c.enqueue(v));
      c.close();
    },
  });
  const chunks = [];
  for await (const chunk of backupChunks(stream, 4)) chunks.push([...chunk]);
  assert.deepEqual(chunks, [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11],
  ]);
});
test('backup stream failures reject instead of completing a truncated upload', async () => {
  let reads = 0;
  const stream = new ReadableStream({
    pull(c) {
      if (reads++ === 0) c.enqueue(new Uint8Array(4));
      else c.error(new Error('broken'));
    },
  });
  await assert.rejects(async () => {
    for await (const chunk of backupChunks(stream, 4))
      assert.equal(chunk.length, 4);
  }, /broken/);
});
test('download IDs reject arbitrary storage keys and traversal', () => {
  assert.ok(validBackupId('daily-2026-10-16'));
  assert.ok(validBackupId('manual-12345678-1234-4123-8123-123456789abc'));
  for (const id of [
    '../database.json',
    '_backups/private.tar',
    'daily-2026-10-16/../../secret',
    '',
  ])
    assert.equal(validBackupId(id), false);
});
