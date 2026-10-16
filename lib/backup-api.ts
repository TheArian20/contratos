import {
  backupTables,
  tarHeader,
  sha256,
  type BackupManifest,
} from './backup-format.ts';
export async function exportBackup(
  DB: D1Database,
  FILES: R2Bucket,
  userId: string,
) {
  const snapshots = await DB.batch<Record<string, unknown>>([
    DB.prepare(
      "SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL AND type IN ('table','index') ORDER BY type DESC,name",
    ),
    ...backupTables.map((t) => DB.prepare(t === 'settings' ? "SELECT * FROM settings WHERE key NOT LIKE 'backup-%'" : `SELECT * FROM "${t}"`)),
  ]);
  if (snapshots.some((s) => !s.success))
    throw new Error('No se pudo obtener una copia consistente.');
  const tables = Object.fromEntries(
    backupTables.map((t, i) => [t, snapshots[i + 1].results]),
  );
  const schema = snapshots[0].results.filter((r) =>
    backupTables.includes(r.tbl_name as (typeof backupTables)[number]),
  );
  const created = new Date().toISOString();
  const database = new TextEncoder().encode(
    JSON.stringify({
      format: 'cartera-database',
      version: 1,
      created,
      schema,
      tables,
    }),
  );
  if (database.byteLength > 64 * 1024 * 1024)
    throw new Error(
      'La base supera el tamaño de esta herramienta de respaldo.',
    );
  const keys = new Set<string>();
  for (const d of tables.datasets) {
    keys.add(String(d.object_key));
    keys.add(`original/${d.id}.xlsx`);
  }
  for (const d of tables.documents) keys.add(String(d.object_key));
  const objects: {
    key: string;
    etag: string;
    size: number;
    contentType: string;
  }[] = [];
  for (const key of keys) {
    const object = await FILES.head(key);
    if (!object)
      throw new Error(
        'Falta un archivo requerido. No se puede crear un respaldo completo.',
      );
    if (object.size > 64 * 1024 * 1024)
      throw new Error('Un archivo supera el límite de respaldo.');
    objects.push({
      key,
      etag: object.etag,
      size: object.size,
      contentType:
        object.httpMetadata?.contentType ?? 'application/octet-stream',
    });
  }
  if (
    database.byteLength + objects.reduce((n, o) => n + o.size, 0) >
    512 * 1024 * 1024
  )
    throw new Error('El respaldo supera 512 MB; requiere exportación técnica.');
  const manifest: BackupManifest = {
    format: 'cartera-backup',
    version: 1,
    created,
    files: [],
    counts: Object.fromEntries(backupTables.map((t) => [t, tables[t].length])),
  };
  async function* generate() {
    const entry = async function* (
      path: string,
      bytes: Uint8Array,
      key?: string,
      contentType?: string,
    ) {
      manifest.files.push({
        path,
        size: bytes.length,
        sha256: await sha256(bytes),
        ...(key ? { key, contentType } : {}),
      });
      yield tarHeader(path, bytes.length);
      yield bytes;
      const pad = (512 - (bytes.length % 512)) % 512;
      if (pad) yield new Uint8Array(pad);
    };
    yield* entry('database.json', database);
    for (const [i, o] of objects.entries()) {
      const body = await FILES.get(o.key, { onlyIf: { etagMatches: o.etag } });
      if (!body || !('body' in body))
        throw new Error('Un archivo cambió durante la copia. Reintenta.');
      const bytes = new Uint8Array(await body.arrayBuffer());
      yield* entry(`objects/${i}.bin`, bytes, o.key, o.contentType);
    }
    await DB.prepare(
      'INSERT INTO audit (id,action,user_id,target,created) VALUES (?,?,?,?,?)',
    )
      .bind(
        crypto.randomUUID(),
        'backup_exported',
        userId,
        created,
        new Date().toISOString(),
      )
      .run();
    const bytes = new TextEncoder().encode(JSON.stringify(manifest));
    yield tarHeader('manifest.json', bytes.length);
    yield bytes;
    const pad = (512 - (bytes.length % 512)) % 512;
    if (pad) yield new Uint8Array(pad);
    yield new Uint8Array(1024);
  }
  const iterator = generate();
  return new Response(
    new ReadableStream({
      async pull(controller) {
        try {
          const next = await iterator.next();
          if (next.done) controller.close();
          else controller.enqueue(next.value);
        } catch (e) {
          controller.error(e);
        }
      },
      async cancel() {
        await iterator.return(undefined);
      },
    }),
    {
      headers: {
        'Content-Type': 'application/x-tar',
        'Content-Disposition': `attachment; filename="cartera-respaldo-${created.slice(0, 10)}.tar"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
