import { exportBackup } from './backup-api.ts';
import { sha256 } from './backup-format.ts';
import { localDay } from './daily-operations.ts';
export type SavedBackup = {
  id: string;
  mode: 'manual' | 'daily';
  status: 'running' | 'complete' | 'failed';
  started: string;
  finished?: string;
  size?: number;
  key?: string;
  error?: string;
  verified?: boolean;
};
export type BackupSchedule = {
  id: string;
  enabled: boolean;
  time: string;
  timezone: string;
};
export const backupRunKey = (id: string) => 'backup-run:' + id;
export function validBackupId(id: string) {
  return /^(daily-\d{4}-\d{2}-\d{2}|manual-[0-9a-f-]{36})$/.test(id);
}
export async function* backupChunks(
  stream: ReadableStream<Uint8Array>,
  size = 8 * 1024 * 1024,
) {
  const reader = stream.getReader();
  let buffer = new Uint8Array(size),
    used = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      let offset = 0;
      while (offset < value.length) {
        const take = Math.min(size - used, value.length - offset);
        buffer.set(value.subarray(offset, offset + take), used);
        used += take;
        offset += take;
        if (used === size) {
          yield buffer;
          buffer = new Uint8Array(size);
          used = 0;
        }
      }
    }
    if (used) yield buffer.slice(0, used);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
async function save(DB: D1Database, run: SavedBackup) {
  await DB.prepare(
    'INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
  )
    .bind(backupRunKey(run.id), JSON.stringify(run))
    .run();
}
export async function backupInfo(DB: D1Database) {
  const rows = await DB.prepare(
    "SELECT value FROM settings WHERE key LIKE 'backup-run:%' ORDER BY json_extract(value,'$.started') DESC LIMIT 60",
  ).all<{ value: string }>();
  const schedule = await DB.prepare(
    "SELECT value FROM settings WHERE key='backup-schedule'",
  ).first<{ value: string }>();
  const runs = rows.results
    .map((r) => JSON.parse(r.value) as SavedBackup)
    .map(({ key, ...r }) => r);
  return {
    runs,
    schedule: schedule ? (JSON.parse(schedule.value) as BackupSchedule) : null,
  };
}
export async function createStoredBackup(
  DB: D1Database,
  FILES: R2Bucket,
  mode: 'manual' | 'daily',
  userId: string,
  manualId?: string,
) {
  const now = new Date(),
    id =
      mode === 'daily'
        ? 'daily-' + localDay(now.toISOString())
        : (manualId ?? 'manual-' + crypto.randomUUID());
  if (!validBackupId(id) || !id.startsWith(mode + '-'))
    throw new Error('Solicitud de respaldo inválida.');
  const token = crypto.randomUUID(),
    lock = await DB.prepare(
      "INSERT INTO settings (key,value) VALUES ('backup-lock',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(json_extract(settings.value,'$.expires') AS INTEGER)<?",
    )
      .bind(
        JSON.stringify({ token, expires: now.valueOf() + 15 * 60 * 1000 }),
        now.valueOf(),
      )
      .run();
  if (lock.meta.changes !== 1)
    throw new Error(
      'Hay un respaldo en preparación. Espera y pulsa Actualizar estado. Si se interrumpió, podrá reintentarse en 15 minutos.',
    );
  let upload: R2MultipartUpload | undefined,
    started = false;
  const run: SavedBackup = {
    id,
    mode,
    status: 'running',
    started: now.toISOString(),
  };
  try {
    const existing = await DB.prepare('SELECT value FROM settings WHERE key=?')
      .bind(backupRunKey(id))
      .first<{ value: string }>();
    if (existing) {
      const previous = JSON.parse(existing.value) as SavedBackup;
      if (previous.status === 'complete' && previous.key) {
        const head = await FILES.head(previous.key);
        if (head && head.size === previous.size) {
          const { key, ...safe } = previous;
          return safe;
        }
      }
    }
    await save(DB, run);
    started = true;
    const response = await exportBackup(DB, FILES, userId);
    if (!response.body) throw new Error('No se generó el archivo de respaldo.');
    const key = `_backups/${id}/${token}.tar`;
    upload = await FILES.createMultipartUpload(key, {
      httpMetadata: { contentType: 'application/x-tar' },
    });
    const parts: R2UploadedPart[] = [],
      hashes: { offset: number; size: number; hash: string }[] = [];
    let size = 0;
    for await (const chunk of backupChunks(response.body)) {
      parts.push(await upload.uploadPart(parts.length + 1, chunk));
      hashes.push({
        offset: size,
        size: chunk.length,
        hash: await sha256(chunk),
      });
      size += chunk.length;
      await DB.prepare(
        "UPDATE settings SET value=? WHERE key='backup-lock' AND json_extract(value,'$.token')=?",
      )
        .bind(
          JSON.stringify({ token, expires: Date.now() + 15 * 60 * 1000 }),
          token,
        )
        .run();
    }
    await upload.complete(parts);
    upload = undefined;
    const head = await FILES.head(key);
    if (!head || head.size !== size)
      throw new Error('El tamaño de la copia guardada no coincide.');
    for (const part of hashes) {
      const body = await FILES.get(key, {
        range: { offset: part.offset, length: part.size },
      });
      if (
        !body ||
        (await sha256(new Uint8Array(await body.arrayBuffer()))) !== part.hash
      )
        throw new Error('La comprobación de la copia guardada falló.');
    }
    Object.assign(run, {
      status: 'complete',
      finished: new Date().toISOString(),
      size,
      key,
      verified: true,
    });
    await save(DB, run);
    const { key: privateKey, ...safe } = run;
    return safe;
  } catch (e) {
    if (upload) await upload.abort().catch(() => {});
    if (started) {
      run.status = 'failed';
      run.finished = new Date().toISOString();
      run.error =
        'No se completó la copia. Reintenta; si persiste, solicita revisión técnica.';
      await save(DB, run);
    }
    throw e;
  } finally {
    await DB.prepare(
      "DELETE FROM settings WHERE key='backup-lock' AND json_extract(value,'$.token')=?",
    )
      .bind(token)
      .run();
  }
}
export async function downloadStoredBackup(
  DB: D1Database,
  FILES: R2Bucket,
  id: string,
) {
  if (!validBackupId(id))
    return new Response('Copia no encontrada', { status: 404 });
  const row = await DB.prepare('SELECT value FROM settings WHERE key=?')
    .bind(backupRunKey(id))
    .first<{ value: string }>();
  const run = row ? (JSON.parse(row.value) as SavedBackup) : null;
  if (!run || run.status !== 'complete' || !run.key)
    return new Response('Copia no disponible', { status: 404 });
  const body = await FILES.get(run.key);
  if (!body || body.size !== run.size)
    return new Response('La copia requiere revisión', { status: 503 });
  return new Response(body.body, {
    headers: {
      'Content-Type': 'application/x-tar',
      'Content-Disposition': `attachment; filename="cartera-${id}.tar"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
