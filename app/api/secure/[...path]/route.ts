import { loadRecordCorrections } from '@/lib/record-corrections-store';
import { pinkMeansPaid } from '@/lib/record-colors';
import { reconcileDataset } from '@/lib/dataset-update';
import { workRoute } from '@/lib/work-api';
import { bindings } from '@/lib/server-store';
import {
  checkPassword,
  digest,
  hashPassword,
  passwordValid,
  publicUser,
  sameOrigin,
  sessionToken,
} from '@/lib/security';
import {
  inspectDataset,
  organizeSheet,
  recordKey,
  type Dataset,
} from '@/lib/source-data';
import {
  recordValues,
  validateEdit,
  editDifferences,
} from '@/lib/record-editing';
import { paymentInput } from '@/lib/concept-payments';
import { attachmentMime } from '@/lib/attachments';

type User = {
  id: string;
  name: string;
  username: string;
  hash: string;
  role: string;
  active: number;
  must_change: number;
};
class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
function fail(status: number, message: string): never {
  throw new ApiError(status, message);
}
const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
function cookie(request: Request, token: string) {
  return `${new URL(request.url).protocol === 'https:' ? '__Host-' : ''}cartera=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? 28800 : 0}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
function tokenFrom(request: Request) {
  const name =
    new URL(request.url).protocol === 'https:' ? '__Host-cartera' : 'cartera';
  return (
    request.headers
      .get('cookie')
      ?.split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? ''
  );
}
async function body(request: Request, max = 25000) {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > max)
    fail(413, 'Contenido demasiado grande.');
  try {
    return JSON.parse(text);
  } catch {
    return fail(400, 'Datos inválidos.');
  }
}
const text = (value: unknown, max = 200) =>
  typeof value === 'string' && value.trim().length <= max ? value.trim() : '';
async function handler(request: Request) {
  try {
    const { DB, FILES, SETUP_TOKEN } = bindings();
    const url = new URL(request.url),
      action = url.pathname.split('/').at(-1),
      write = request.method !== 'GET';
    if (write && !sameOrigin(request)) fail(403, 'Origen no autorizado.');
    const log = (user: string, action: string, target: string) =>
      DB.prepare(
        'INSERT INTO audit (id,action,user_id,target,created) VALUES (?,?,?,?,?)',
      ).bind(
        crypto.randomUUID(),
        action,
        user,
        target,
        new Date().toISOString(),
      );
    if (action === 'setup' && request.method === 'POST') {
      if (
        !SETUP_TOKEN ||
        (await digest(request.headers.get('authorization') ?? '')) !==
          (await digest(`Bearer ${SETUP_TOKEN}`))
      )
        fail(403, 'Acceso no autorizado.');
      if (
        await DB.prepare(
          "SELECT key FROM settings WHERE key='setup_complete'",
        ).first()
      )
        fail(409, 'La cuenta inicial ya está creada.');
      const data = await body(request);
      if (!passwordValid(data.password))
        fail(400, 'Contraseña de 8 caracteres como mínimo y hasta 72 bytes.');
      const id = crypto.randomUUID();
      await DB.batch([
        DB.prepare(
          "INSERT INTO settings (key,value) VALUES ('setup_complete','1')",
        ),
        DB.prepare(
          "INSERT INTO users (id,username,name,hash,role,active,must_change) VALUES (?,?,?,?, 'Administrador',1,0)",
        ).bind(
          id,
          'administrador',
          'Administración',
          await hashPassword(data.password),
        ),
        log(id, 'setup', id),
      ]);
      return json({ ok: true });
    }
    if (action === 'login' && request.method === 'POST') {
      const data = await body(request),
        username = text(data.username, 60).toLowerCase();
      if (!passwordValid(data.password) || !username)
        fail(401, 'Usuario o contraseña incorrectos.');
      const now = Date.now(),
        expires = now + 15 * 60 * 1000;
      await DB.prepare('DELETE FROM attempts WHERE expires < ?')
        .bind(now)
        .run();
      const keys = [
        await digest(
          `ip:${request.headers.get('cf-connecting-ip') ?? 'local'}`,
        ),
        await digest(`user:${username}`),
      ];
      const attempts = await DB.batch(
        keys.map((key) =>
          DB.prepare(
            'INSERT INTO attempts (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count',
          ).bind(key, expires),
        ),
      );
      if (
        attempts.some(
          (r, i) =>
            Number((r.results[0] as { count: number }).count) >
            (i === 0 ? 40 : 10),
        )
      )
        fail(429, 'Demasiados intentos. Espera 15 minutos.');
      const user = await DB.prepare(
        'SELECT * FROM users WHERE username=? AND active=1',
      )
        .bind(username)
        .first<User>();
      const dummy =
        '$2b$12$uSctLMZPVk0sFvG47BdYGepFCQ7oh7s4YxoFFnB0OhPtVPQWGjdbK';
      if (!(await checkPassword(data.password, user?.hash ?? dummy)) || !user)
        fail(401, 'Usuario o contraseña incorrectos.');
      const token = sessionToken();
      await DB.batch([
        DB.prepare('DELETE FROM sessions WHERE expires < ?').bind(now),
        DB.prepare(
          'INSERT INTO sessions (token,user_id,expires) VALUES (?,?,?)',
        ).bind(await digest(token), user.id, now + 8 * 3600000),
        log(user.id, 'login', user.id),
      ]);
      return json({ user: publicUser(user) }, 200, {
        'Set-Cookie': cookie(request, token),
      });
    }
    const token = tokenFrom(request);
    const user = token
      ? await DB.prepare(
          'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.active=1',
        )
          .bind(await digest(token), Date.now())
          .first<User>()
      : null;
    if (!user) fail(401, 'Inicia sesión para acceder.');
    if (action === 'session' && !write) return json({ user: publicUser(user) });
    if (action === 'logout' && write) {
      await DB.prepare('DELETE FROM sessions WHERE token=?')
        .bind(await digest(token))
        .run();
      return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '') });
    }
    if (action === 'password' && request.method === 'POST') {
      const data = await body(request);
      if (
        !passwordValid(data.password) ||
        typeof data.current !== 'string' ||
        !(await checkPassword(data.current, user.hash))
      )
        fail(
          400,
          'Comprueba tu contraseña actual. La nueva debe tener al menos 8 caracteres y hasta 72 bytes.',
        );
      await DB.batch([
        DB.prepare('UPDATE users SET hash=?,must_change=0 WHERE id=?').bind(
          await hashPassword(data.password),
          user.id,
        ),
        DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id),
        log(user.id, 'password_changed', user.id),
      ]);
      return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '') });
    }
    if (user.must_change)
      fail(403, 'Cambia tu contraseña inicial antes de acceder a la base.');
    if (action?.startsWith('desk-')) return workRoute(request, DB, FILES, user);
    const admin = () => {
      if (user.role !== 'Administrador')
        fail(403, 'Solo Administración puede realizar esta acción.');
    };
    const editor = () => {
      if (user.role === 'Consulta')
        fail(403, 'Tu cuenta permite solo consultar.');
    };
    if (action === 'users') {
      admin();
      if (!write) {
        const rows = await DB.prepare(
          'SELECT id,username,name,role,active,must_change FROM users ORDER BY name',
        ).all();
        return json(rows.results.map(publicUser));
      }
      const data = await body(request);
      if (request.method === 'POST') {
        const username = text(data.username, 60).toLowerCase(),
          name = text(data.name, 100);
        if (
          !/^[a-z0-9._-]{3,60}$/.test(username) ||
          !name ||
          !passwordValid(data.password) ||
          !['Administrador', 'Gestor', 'Consulta'].includes(data.role)
        )
          fail(
            400,
            'Revisa nombre, usuario, rol y contraseña (mínimo 8 caracteres).',
          );
        if (
          await DB.prepare('SELECT id FROM users WHERE username=?')
            .bind(username)
            .first()
        )
          fail(409, 'Ese usuario ya existe.');
        const id = crypto.randomUUID();
        await DB.batch([
          DB.prepare(
            'INSERT INTO users (id,username,name,hash,role) VALUES (?,?,?,?,?)',
          ).bind(
            id,
            username,
            name,
            await hashPassword(data.password),
            data.role,
          ),
          log(user.id, 'user_created', id),
        ]);
      } else if (request.method === 'DELETE') {
        const id = text(data.id);
        if (id === user.id) fail(400, 'No puedes eliminar tu propia cuenta.');
        const target = await DB.prepare(
          'SELECT id,username,name,role,active FROM users WHERE id=?',
        )
          .bind(id)
          .first<{
            id: string;
            username: string;
            name: string;
            role: string;
            active: number;
          }>();
        if (!target) fail(404, 'Usuario no encontrado.');
        if (data.confirmUsername !== target.username)
          fail(400, 'Escribe el usuario exacto para confirmar la eliminación.');
        const allowed =
          "(role!='Administrador' OR active=0 OR (SELECT count(*) FROM users WHERE role='Administrador' AND active=1)>1)";
        const results = await DB.batch([
          DB.prepare(
            `DELETE FROM sessions WHERE user_id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND ${allowed})`,
          ).bind(id, id),
          DB.prepare(`DELETE FROM users WHERE id=? AND ${allowed}`).bind(id),
          DB.prepare(
            'INSERT INTO audit (id,action,user_id,target,created) SELECT ?,?,?,?,? WHERE changes()=1',
          ).bind(
            crypto.randomUUID(),
            'user_deleted',
            user.id,
            JSON.stringify(target),
            new Date().toISOString(),
          ),
        ]);
        if (results[1].meta.changes !== 1)
          fail(
            409,
            'No se puede eliminar el último administrador activo o la cuenta ya cambió.',
          );
      } else if (request.method === 'PATCH') {
        const id = text(data.id);
        if (id === user.id) fail(400, 'No puedes desactivar tu propia cuenta.');
        const target = await DB.prepare('SELECT id FROM users WHERE id=?')
          .bind(id)
          .first();
        if (!target) fail(404, 'Usuario no encontrado.');
        if (typeof data.active !== 'boolean') fail(400, 'Estado inválido.');
        await DB.batch([
          DB.prepare(
            "UPDATE users SET active=? WHERE id=? AND (role!='Administrador' OR active=0 OR (SELECT count(*) FROM users WHERE role='Administrador' AND active=1)>1)",
          ).bind(data.active ? 1 : 0, id),
          DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(id),
          log(user.id, 'user_access_changed', id),
        ]);
      } else fail(405, 'Método no permitido.');
      return json({ ok: true });
    }
    if (action === 'dataset-versions' && request.method === 'GET') {
      const versions = await DB.prepare(
        'SELECT id,name,created,manifest FROM datasets ORDER BY created DESC',
      ).all();
      return json(versions.results);
    }
    if (action === 'dataset-review' || action === 'dataset-update') {
      admin();
      if (request.method !== 'POST') fail(405, 'Método no permitido.');
      const input = await body(request, 20 * 1024 * 1024);
      const incoming = input.dataset as Dataset;
      inspectDataset(incoming);
      const current = await DB.prepare(
        'SELECT id,object_key FROM datasets ORDER BY created DESC LIMIT 1',
      ).first<{ id: string; object_key: string }>();
      if (!current) fail(409, 'Primero debe importarse la base inicial.');
      if (input.previousHash !== current.id)
        fail(409, 'La base cambió. Vuelve a revisar la actualización.');
      const original = await FILES.get(current.object_key);
      if (!original) fail(503, 'La base anterior no está disponible.');
      if (incoming.sourceHash === current.id)
        fail(409, 'Este archivo ya es la versión actual.');
      const result = reconcileDataset(await original.json<Dataset>(), incoming);
      if (action === 'dataset-review') return json(result.summary);
      const reason = text(input.reason, 1000);
      if (input.confirmed !== true || !reason)
        fail(400, 'Confirma la revisión e indica el motivo.');
      if (
        !(await DB.prepare('SELECT value FROM settings WHERE key=?')
          .bind(`source:${incoming.sourceHash}`)
          .first())
      )
        fail(400, 'Guarda primero el Excel original.');
      if (
        await DB.prepare('SELECT id FROM datasets WHERE id=?')
          .bind(incoming.sourceHash)
          .first()
      )
        fail(409, 'Este archivo ya está archivado; no puede sobrescribirse.');
      const encoded = JSON.stringify(result.data),
        sha = await digest(encoded),
        key = `dataset/${incoming.sourceHash}/${sha}.json`;
      await FILES.put(key, encoded, {
        httpMetadata: { contentType: 'application/json' },
      });
      const [inserted] = await DB.batch([
        DB.prepare(
          'INSERT INTO datasets (id,name,object_key,sha256,created,manifest) SELECT ?,?,?,?,?,? WHERE (SELECT id FROM datasets ORDER BY created DESC LIMIT 1)=?',
        ).bind(
          incoming.sourceHash,
          text(incoming.sourceName, 200),
          key,
          sha,
          new Date().toISOString(),
          JSON.stringify(inspectDataset(result.data)),
          current.id,
        ),
        DB.prepare(
          'INSERT INTO audit (id,action,user_id,target,created) SELECT ?,?,?,?,? WHERE changes()=1',
        ).bind(
          crypto.randomUUID(),
          'dataset_updated',
          user.id,
          JSON.stringify({ ...result.summary, reason }),
          new Date().toISOString(),
        ),
      ]);
      if (inserted.meta.changes !== 1)
        fail(409, 'Otra actualización terminó antes. Revisa nuevamente.');
      return json({ ok: true, summary: result.summary });
    }
    if (action === 'source') {
      admin();
      if (request.method === 'PUT') {
        const bytes = await request.arrayBuffer();
        if (
          bytes.byteLength > 15 * 1024 * 1024 ||
          bytes.byteLength < 4 ||
          new Uint8Array(bytes)[0] !== 80 ||
          new Uint8Array(bytes)[1] !== 75
        )
          fail(400, 'Excel inválido.');
        const hash = await digest(bytes);
        await FILES.put(`original/${hash}.xlsx`, bytes, {
          httpMetadata: {
            contentType:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        });
        await DB.prepare(
          'INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        )
          .bind(`source:${hash}`, '1')
          .run();
        return json({ hash });
      }
      if (request.method !== 'GET') fail(405, 'Método no permitido.');
      const requested = url.searchParams.get('id');
      const dataset = await (
        requested
          ? DB.prepare('SELECT id FROM datasets WHERE id=?').bind(requested)
          : DB.prepare('SELECT id FROM datasets ORDER BY created DESC LIMIT 1')
      ).first<{ id: string }>();
      if (!dataset) fail(404, 'No hay archivo original.');
      const object = await FILES.get(`original/${dataset.id}.xlsx`);
      if (!object) fail(404, 'Archivo no encontrado.');
      return new Response(object.body, {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="base-original.xlsx"',
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    if (action === 'dataset') {
      if (request.method === 'PUT') {
        admin();
        const data: Dataset = await body(request, 20 * 1024 * 1024);
        const manifest = inspectDataset(data);
        if (
          !(await DB.prepare('SELECT value FROM settings WHERE key=?')
            .bind(`source:${data.sourceHash}`)
            .first())
        )
          fail(400, 'Guarda primero el Excel original.');
        const encoded = JSON.stringify(data),
          sha = await digest(encoded),
          key = `dataset/${data.sourceHash}/${sha}.json`;
        const existing = await DB.prepare(
          'SELECT sha256 FROM datasets WHERE id=?',
        )
          .bind(data.sourceHash)
          .first<{ sha256: string }>();
        if (existing) {
          if (existing.sha256 !== sha)
            fail(409, 'Existe una importación distinta del mismo archivo.');
          return json({ ok: true, sha256: sha, manifest });
        }
        if (await DB.prepare('SELECT id FROM datasets LIMIT 1').first())
          fail(
            409,
            'La base ya está importada. Las actualizaciones requieren conciliación; no se reemplaza el original.',
          );
        await FILES.put(key, encoded, {
          httpMetadata: { contentType: 'application/json' },
        });
        await DB.batch([
          DB.prepare(
            'INSERT INTO datasets (id,name,object_key,sha256,created,manifest) VALUES (?,?,?,?,?,?)',
          ).bind(
            data.sourceHash,
            text(data.sourceName, 200),
            key,
            sha,
            new Date().toISOString(),
            JSON.stringify(manifest),
          ),
          log(user.id, 'dataset_imported', data.sourceHash),
        ]);
        return json({ ok: true, sha256: sha, manifest });
      }
      if (request.method !== 'GET') fail(405, 'Método no permitido.');
      const requested = url.searchParams.get('id');
      const dataset = await (
        requested
          ? DB.prepare('SELECT * FROM datasets WHERE id=?').bind(requested)
          : DB.prepare('SELECT * FROM datasets ORDER BY created DESC LIMIT 1')
      ).first<{ object_key: string; sha256: string }>();
      if (!dataset) return json({ dataset: null });
      const object = await FILES.get(dataset.object_key);
      if (!object) fail(503, 'La base no está disponible.');
      if (!requested) {
        const data = await object.json<Dataset>();
        data.corrections = await loadRecordCorrections(DB);
        return json(data);
      }
      return new Response(object.body, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Data-SHA256': dataset.sha256,
        },
      });
    }
    async function validRecord(id: string) {
      if (/^manual:[0-9a-f-]{36}$/.test(id)) {
        const found = await DB.prepare(
          'SELECT p.id FROM people p JOIN person_sources s ON s.person_id=p.id WHERE s.record_id=?',
        )
          .bind(id)
          .first();
        if (!found) fail(404, 'Persona no encontrada.');
        return;
      }
      if (!/^[a-f0-9]{64}:\d+:\d+$/.test(id)) fail(400, 'Expediente inválido.');
      const [hash, sheet, row] = id.split(':');
      const dataset = await DB.prepare(
        'SELECT object_key FROM datasets WHERE id=?',
      )
        .bind(hash)
        .first<{ object_key: string }>();
      if (!dataset) fail(404, 'Base no encontrada.');
      const object = await FILES.get(dataset.object_key);
      if (!object) fail(404, 'Base no encontrada.');
      const data = await object.json<Dataset>();
      if (!data.sheets[Number(sheet)]?.rows.some((r) => r.row === Number(row)))
        fail(404, 'Fila no encontrada.');
    }
    if (action === 'record-correction') {
      editor();
      if (request.method !== 'POST') fail(405, 'Método no permitido.');
      const input = await body(request);
      const id = text(input.recordId);
      const latest = await DB.prepare(
        'SELECT id,object_key FROM datasets ORDER BY created DESC LIMIT 1',
      ).first<{ id: string; object_key: string }>();
      if (!latest || input.sourceHash !== latest.id)
        fail(409, 'La base cambió. Recarga los datos antes de guardar.');
      const object = await FILES.get(latest.object_key);
      if (!object) fail(503, 'No se pudo abrir el expediente.');
      const source = await object.json<Dataset>();
      const key = `record-correction:${id}`;
      const old = await DB.prepare('SELECT value FROM settings WHERE key=?')
        .bind(key)
        .first<{ value: string }>();
      const previous = old ? (await loadRecordCorrections(DB))[id] : null;
      if (!Number.isSafeInteger(input.version) || input.version < 0)
        fail(400, 'Versión inválida.');
      if ((previous?.version ?? 0) !== input.version)
        fail(
          409,
          'Otra persona modificó este expediente. Recarga los datos y revisa los cambios.',
        );
      source.corrections = previous ? { [id]: previous } : {};
      const record = source.sheets
        .flatMap((s, i) => organizeSheet(s, i, source.styles, source).records)
        .find((r) => recordKey(source, r) === id);
      if (!record || record.kind !== 'Expediente')
        fail(404, 'No se encontró un expediente vigente con esos datos.');
      const before = recordValues(record);
      const sheetName = source.sheets[Number(record.id.split(':')[0])].name;
      if (
        pinkMeansPaid(sheetName) &&
        input.color === 'pink' &&
        input.paidInFull !== true
      )
        fail(
          400,
          'En Ciudad de Dios, rosado significa sin deuda. Administración debe confirmar ese estado.',
        );
      if (pinkMeansPaid(sheetName) && input.paidInFull === true)
        input.color = 'pink';
      if (
        user.role !== 'Administrador' &&
        input.paidInFull !== before.paidInFull
      )
        fail(403, 'Solo Administración puede cambiar el estado de deuda.');
      let values;
      try {
        values = validateEdit(input, before, user.role === 'Administrador');
      } catch (e) {
        fail(400, e instanceof Error ? e.message : 'Revisa los datos.');
      }
      const reason = text(input.reason, 1500),
        note = text(input.newObservation, 1500);
      if (
        !reason ||
        typeof input.reason !== 'string' ||
        input.reason.trim().length > 1500 ||
        (input.newObservation !== undefined &&
          (typeof input.newObservation !== 'string' ||
            input.newObservation.length > 1500))
      )
        fail(400, 'Escribe un motivo y observación de hasta 1500 caracteres.');
      if (!editDifferences(before, values).length && !note)
        fail(400, 'No hay cambios para guardar.');
      const after = {
        ...previous,
        ...values,
        debtConfirmed:
          previous?.debtConfirmed === true ||
          before.paidInFull !== values.paidInFull,
        observation: previous?.observation ?? '',
        notes: [...(previous?.notes ?? []), ...(note ? [note] : [])],
        version: input.version + 1,
      };
      const mutation = old
        ? DB.prepare(
            'UPDATE settings SET value=? WHERE key=? AND value=? AND (SELECT id FROM datasets ORDER BY created DESC LIMIT 1)=?',
          ).bind(JSON.stringify(after), key, old.value, latest.id)
        : DB.prepare(
            'INSERT OR IGNORE INTO settings (key,value) SELECT ?,? WHERE (SELECT id FROM datasets ORDER BY created DESC LIMIT 1)=?',
          ).bind(key, JSON.stringify(after), latest.id);
      const result = await DB.batch([
        mutation,
        DB.prepare(
          'INSERT INTO audit (id,action,user_id,target,created) SELECT ?,?,?,?,? WHERE changes()=1',
        ).bind(
          crypto.randomUUID(),
          'record_corrected',
          user.id,
          JSON.stringify({
            recordId: id,
            before,
            after,
            reason,
            newObservation: note,
            author: user.name,
            username: user.username,
          }),
          new Date().toISOString(),
        ),
      ]);
      if (result[0].meta.changes !== 1)
        fail(
          409,
          'Otra persona modificó el expediente o la base. Recarga los datos antes de guardar.',
        );
      return json(after);
    }
    if (action === 'record-history' && !write) {
      admin();
      const id = url.searchParams.get('id') ?? '';
      await validRecord(id);
      const rows = await DB.prepare(
        "SELECT target,created FROM audit WHERE action='record_corrected' AND json_extract(target,'$.recordId')=? ORDER BY created DESC",
      )
        .bind(id)
        .all<{ target: string; created: string }>();
      return json(
        rows.results.map((r) => ({
          ...JSON.parse(r.target),
          created: r.created,
        })),
      );
    }
    if (action === 'record' && !write) {
      const id = url.searchParams.get('id') ?? '';
      await validRecord(id);
      const [docs, entries] = await DB.batch([
        DB.prepare(
          'SELECT id,name,category,size,created,author FROM documents WHERE record_id=? ORDER BY created DESC',
        ).bind(id),
        DB.prepare(
          'SELECT id,kind,body,created,author FROM entries WHERE record_id=? ORDER BY created DESC',
        ).bind(id),
      ]);
      return json({ documents: docs.results, entries: entries.results });
    }
    if (action === 'payments') {
      if (request.method === 'POST')
        fail(
          409,
          'Usa Registrar pago en Trabajo diario para seleccionar una cuenta confirmada.',
        );
      const recordId =
        request.method === 'GET' ? (url.searchParams.get('id') ?? '') : '';
      if (request.method === 'GET') {
        await validRecord(recordId);
        const rows = await DB.prepare(
          'SELECT * FROM payments WHERE record_id=? ORDER BY date DESC,created DESC',
        )
          .bind(recordId)
          .all();
        return json(rows.results);
      }
      if (request.method !== 'POST') fail(405, 'M?todo no permitido.');
      editor();
      const data = await body(request);
      const id = text(data.recordId);
      await validRecord(id);
      let payment;
      try {
        payment = paymentInput(data);
      } catch (e) {
        fail(400, e instanceof Error ? e.message : 'Abono inv?lido.');
      }
      const existing = await DB.prepare(
        'SELECT id FROM payments WHERE record_id=? AND concept=? AND reference=?',
      )
        .bind(id, payment.concept, payment.reference)
        .first();
      if (existing)
        fail(
          409,
          'Ese recibo ya est? registrado para este concepto en el expediente.',
        );
      try {
        await DB.batch([
          DB.prepare(
            'INSERT INTO payments (id,record_id,concept,lot,cents,date,reference,author,created) VALUES (?,?,?,?,?,?,?,?,?)',
          ).bind(
            crypto.randomUUID(),
            id,
            payment.concept,
            payment.lot,
            payment.cents,
            payment.date,
            payment.reference,
            user.name,
            new Date().toISOString(),
          ),
          log(user.id, 'payment_recorded', id),
        ]);
      } catch (e) {
        if (String(e).includes('UNIQUE')) fail(409, 'El recibo ya existe.');
        throw e;
      }
      return json({ ok: true });
    }
    if (action === 'entry' && request.method === 'POST') {
      editor();
      const data = await body(request),
        id = text(data.recordId);
      await validRecord(id);
      if (
        !['Gestión', 'Corrección pendiente'].includes(data.kind) ||
        !text(data.body, 10000)
      )
        fail(400, 'Escribe la descripción de la gestión o corrección.');
      await DB.batch([
        DB.prepare(
          'INSERT INTO entries (id,record_id,kind,body,created,author) VALUES (?,?,?,?,?,?)',
        ).bind(
          crypto.randomUUID(),
          id,
          data.kind,
          text(data.body, 10000),
          new Date().toISOString(),
          user.name,
        ),
        log(user.id, 'entry_created', id),
      ]);
      return json({ ok: true });
    }
    if (action === 'documents' && request.method === 'POST') {
      editor();
      if (Number(request.headers.get('content-length') ?? 0) > 11 * 1024 * 1024)
        fail(413, 'Máximo 10 MB por archivo.');
      const form = await request.formData(),
        id = text(form.get('recordId')),
        file = form.get('file'),
        category = text(form.get('category'));
      await validRecord(id);
      if (
        !(file instanceof File) ||
        !file.size ||
        file.size > 10 * 1024 * 1024 ||
        !attachmentMime(file.name) ||
        !['Contrato', 'Cobranza', 'Otro documento'].includes(category)
      )
        fail(400, 'Adjunta PDF, JPG, PNG o WebP de hasta 10 MB.');
      const bytes = new Uint8Array(await file.arrayBuffer()),
        mime = attachmentMime(file.name);
      const magic =
        mime === 'application/pdf'
          ? new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-'
          : mime === 'image/jpeg'
            ? bytes[0] === 255 && bytes[1] === 216
            : mime === 'image/png'
              ? bytes[0] === 137 &&
                bytes[1] === 80 &&
                bytes[2] === 78 &&
                bytes[3] === 71
              : new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
                new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
      if (!magic)
        fail(400, 'El contenido no coincide con el formato del archivo.');
      const docId = crypto.randomUUID(),
        key = `documents/${docId}`;
      await FILES.put(key, bytes, { httpMetadata: { contentType: mime } });
      try {
        await DB.batch([
          DB.prepare(
            'INSERT INTO documents (id,record_id,name,category,object_key,size,created,author) VALUES (?,?,?,?,?,?,?,?)',
          ).bind(
            docId,
            id,
            file.name.slice(0, 200),
            category,
            key,
            file.size,
            new Date().toISOString(),
            user.name,
          ),
          log(user.id, 'document_added', id),
        ]);
      } catch (error) {
        await FILES.delete(key);
        throw error;
      }
      return json({ ok: true });
    }
    if (action === 'document' && !write) {
      const doc = await DB.prepare('SELECT * FROM documents WHERE id=?')
        .bind(url.searchParams.get('id') ?? '')
        .first<{ object_key: string; name: string }>();
      if (!doc) fail(404, 'Documento no encontrado.');
      const object = await FILES.get(doc.object_key);
      if (!object) fail(404, 'Documento no disponible.');
      return new Response(object.body, {
        headers: {
          'Content-Type':
            object.httpMetadata?.contentType ?? 'application/octet-stream',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    fail(404, 'Ruta no encontrada.');
  } catch (error) {
    return json(
      {
        error:
          error instanceof ApiError
            ? error.message
            : 'No se pudo completar la operación. Vuelve a intentarlo.',
      },
      error instanceof ApiError ? error.status : 500,
    );
  }
}
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;

export const DELETE = handler;
