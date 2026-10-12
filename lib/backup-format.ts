export const backupTables = [
  'users',
  'settings',
  'datasets',
  'documents',
  'entries',
  'audit',
  'people',
  'person_sources',
  'lots',
  'accounts',
  'payments',
  'installments',
  'tasks',
  'changes',
] as const;
export const sha256 = async (bytes: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>),
    ),
  )
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
export function tarHeader(name: string, size: number) {
  if (
    !/^[a-zA-Z0-9/._-]{1,99}$/.test(name) ||
    name.includes('..') ||
    !Number.isSafeInteger(size) ||
    size < 0 ||
    size > 0o77777777777
  )
    throw new Error('Archivo de respaldo inválido.');
  const bytes = new Uint8Array(512),
    put = (offset: number, text: string) =>
      bytes.set(new TextEncoder().encode(text), offset);
  put(0, name);
  put(100, '0000600\0');
  put(108, '0000000\0');
  put(116, '0000000\0');
  put(124, size.toString(8).padStart(11, '0') + '\0');
  put(136, '00000000000\0');
  put(148, '        ');
  put(156, '0');
  put(257, 'ustar\0');
  put(263, '00');
  put(
    148,
    bytes
      .reduce((n, v) => n + v, 0)
      .toString(8)
      .padStart(6, '0') + '\0 ',
  );
  return bytes;
}
export type BackupManifest = {
  format: 'cartera-backup';
  version: 1;
  created: string;
  files: {
    path: string;
    size: number;
    sha256: string;
    key?: string;
    contentType?: string;
  }[];
  counts: Record<string, number>;
};
export async function verifyBackup(file: Blob): Promise<BackupManifest> {
  let offset = 0,
    manifest: BackupManifest | undefined,
    ended = false;
  const found = new Map<string, { size: number; sha256: string }>();
  while (offset + 512 <= file.size) {
    const header = new Uint8Array(
      await file.slice(offset, offset + 512).arrayBuffer(),
    );
    offset += 512;
    if (header.every((v) => v === 0)) {
      ended = true;
      break;
    }
    const dec = (start: number, len: number) =>
      new TextDecoder()
        .decode(header.slice(start, start + len))
        .split('\0')[0]
        .trim();
    const name = dec(0, 100),
      size = parseInt(dec(124, 12), 8),
      checksum = parseInt(dec(148, 8), 8);
    const sum = header.reduce(
      (n, v, i) => n + (i >= 148 && i < 156 ? 32 : v),
      0,
    );
    if (
      checksum !== sum ||
      !Number.isSafeInteger(size) ||
      size < 0 ||
      size > 64 * 1024 * 1024 ||
      offset + size > file.size ||
      found.has(name) ||
      !/^(database\.json|manifest\.json|objects\/\d+\.bin)$/.test(name) ||
      header[156] !== 48
    )
      throw new Error('Respaldo incompleto o formato inválido.');
    const bytes = new Uint8Array(
      await file.slice(offset, offset + size).arrayBuffer(),
    );
    offset += Math.ceil(size / 512) * 512;
    if (name === 'manifest.json') {
      if (manifest) throw new Error('Manifiesto duplicado.');
      manifest = JSON.parse(new TextDecoder().decode(bytes));
    } else found.set(name, { size, sha256: await sha256(bytes) });
  }
  if (
    !ended ||
    !manifest ||
    manifest.format !== 'cartera-backup' ||
    manifest.version !== 1 ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== found.size ||
    !found.has('database.json')
  )
    throw new Error('Falta la confirmación final del respaldo.');
  const names = new Set<string>();
  for (const f of manifest.files) {
    const actual = found.get(f.path);
    if (
      names.has(f.path) ||
      !actual ||
      actual.size !== f.size ||
      actual.sha256 !== f.sha256
    )
      throw new Error('El respaldo está incompleto o fue modificado.');
    names.add(f.path);
  }
  return manifest;
}
