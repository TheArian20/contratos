import { concepts } from './concept-payments';
import { centsInput, validDay, todayLocal, monthlyPlan } from './work-ledger';
import { organizeSheet, recordKey, type Dataset } from './source-data';
type User = { id: string; name: string; role: string };
class WorkError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
const required = (v: unknown, max = 250) => {
  if (typeof v !== 'string' || !v.trim() || v.trim().length > max)
    throw new WorkError('Completa los campos obligatorios.');
  return v.trim();
};
const optional = (v: unknown, max = 250) =>
  v === '' || v === null || v === undefined ? '' : required(v, max);
export async function workRoute(
  request: Request,
  DB: D1Database,
  FILES: R2Bucket,
  user: User,
) {
  const respond = (data: unknown, status = 200) =>
    Response.json(data, {
      status,
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  try {
    const url = new URL(request.url),
      action = url.pathname.split('/').at(-1);
    if (action === 'desk-state' && request.method === 'GET') {
      const tables = [
        'people',
        'person_sources',
        'lots',
        'accounts',
        'payments',
        'installments',
        'tasks',
        'changes',
      ];
      const rows = await DB.batch(
        tables.map((t) => DB.prepare(`SELECT * FROM ${t}`)),
      );
      const docs = await DB.prepare(
        'SELECT id,record_id,name,category,author,created FROM documents',
      ).all();
      const notes = await DB.prepare(
        'SELECT id,record_id,kind,body,author,created FROM entries',
      ).all();
      return respond(
        Object.fromEntries([
          ...rows.map((r, i) => [i === 1 ? 'sources' : tables[i], r.results]),
          ['documents', docs.results],
          ['entries', notes.results],
        ]),
      );
    }
    if (request.method !== 'POST')
      throw new WorkError('Método no permitido.', 405);
    if (user.role === 'Consulta')
      throw new WorkError('Tu cuenta permite solo consultar.', 403);
    const raw = await request.text();
    if (raw.length > 30000)
      throw new WorkError('Solicitud demasiado grande.', 413);
    const d = JSON.parse(raw);
    const admin = () => {
      if (user.role !== 'Administrador')
        throw new WorkError(
          'Solo Administración puede confirmar o corregir estos datos.',
          403,
        );
    };
    const now = new Date().toISOString(),
      id = crypto.randomUUID();
    const getPerson = async (id: string) => {
      const p = await DB.prepare('SELECT * FROM people WHERE id=?')
        .bind(id)
        .first();
      if (!p) throw new WorkError('Persona no encontrada.', 404);
      return p;
    };
    const history = (
      personId: string,
      entity: string,
      before: unknown,
      after: unknown,
      reason: string,
      guard = false,
    ) =>
      DB.prepare(
        `INSERT INTO changes (id,person_id,entity,before,after,reason,author,created) SELECT ?,?,?,?,?,?,?,? ${guard ? 'WHERE changes()=1' : ''}`,
      ).bind(
        crypto.randomUUID(),
        personId,
        entity,
        JSON.stringify(before),
        JSON.stringify(after),
        reason,
        user.name,
        now,
      );
    const mutate = async (statements: D1PreparedStatement[]) => {
      const results = await DB.batch(statements);
      if (results.some((r) => r.meta.changes !== 1))
        throw new WorkError(
          'El registro cambió o la operación ya no es válida. Actualiza la ficha y revisa los importes.',
          409,
        );
    };
    async function sourceRecords(recordIds: string[]) {
      const ds = await DB.prepare(
        'SELECT id,object_key FROM datasets ORDER BY created DESC LIMIT 1',
      ).first<{ id: string; object_key: string }>();
      if (!ds) throw new WorkError('No hay una base importada.');
      const obj = await FILES.get(ds.object_key);
      if (!obj) throw new WorkError('No se pudo abrir el origen.');
      const data = await obj.json<Dataset>();
      const records = data.sheets.flatMap(
        (sheet, i) => organizeSheet(sheet, i).records,
      );
      return recordIds.map((key) => {
        const record = records.find((r) => recordKey(data, r) === key);
        if (!record)
          throw new WorkError(
            'Este origen solo existe en una versión anterior. Revisa el archivo actual antes de vincularlo.',
          );
        return record;
      });
    }
    if (action === 'desk-person') {
      admin();
      const name = required(d.name, 150),
        document = optional(d.document, 40).replace(/\s+/g, '').toUpperCase(),
        phone = optional(d.phone, 80),
        address = optional(d.address, 300),
        reason = required(d.reason, 1500);
      if (d.id) {
        const p = await getPerson(required(d.id));
        await mutate([
          DB.prepare(
            'UPDATE people SET name=?,document=?,phone=?,address=?,version=version+1 WHERE id=? AND version=?',
          ).bind(name, document, phone, address, p.id, d.version),
          history(
            String(p.id),
            'Datos de persona',
            p,
            { name, document, phone, address },
            reason,
            true,
          ),
        ]);
        return respond({ id: p.id });
      }
      const recordIds = [
        ...new Set<string>(Array.isArray(d.records) ? d.records : []),
      ];
      if (!recordIds.length || recordIds.length > 30 || d.confirmed !== true)
        throw new WorkError(
          'Selecciona y confirma los registros de esta persona.',
        );
      const source = await sourceRecords(recordIds);
      if (!source.some((r) => r.person) && !name)
        throw new WorkError('Confirma el nombre de la persona.');
      if (
        document &&
        (await DB.prepare('SELECT id FROM people WHERE document=?')
          .bind(document)
          .first())
      )
        throw new WorkError(
          'Ya existe una ficha con esta identificación. Agrega los registros a esa ficha.',
          409,
        );
      await DB.batch([
        DB.prepare(
          'INSERT INTO people (id,name,document,phone,address,created) VALUES (?,?,?,?,?,?)',
        ).bind(id, name, document, phone, address, now),
        ...recordIds.map((key) =>
          DB.prepare(
            'INSERT INTO person_sources (record_id,person_id,reason) VALUES (?,?,?)',
          ).bind(key, id, reason),
        ),
        history(
          id,
          'Ficha confirmada',
          null,
          { name, document, phone, address, records: recordIds },
          reason,
        ),
      ]);
      return respond({ id });
    }
    if (action === 'desk-link') {
      admin();
      const personId = required(d.personId),
        reason = required(d.reason, 1500);
      await getPerson(personId);
      const records = [
        ...new Set<string>(Array.isArray(d.records) ? d.records : []),
      ];
      if (!records.length || records.length > 30 || d.confirmed !== true)
        throw new WorkError(
          'Confirma las referencias que pertenecen a esta persona.',
        );
      await sourceRecords(records);
      await DB.batch([
        ...records.map((key) =>
          DB.prepare(
            'INSERT INTO person_sources (record_id,person_id,reason) VALUES (?,?,?)',
          ).bind(key, personId, reason),
        ),
        history(personId, 'Registros vinculados', null, records, reason),
      ]);
      return respond({ ok: true });
    }
    if (action === 'desk-unlink') {
      admin();
      const personId = required(d.personId),
        recordId = required(d.recordId),
        reason = required(d.reason, 1500);
      await getPerson(personId);
      if (
        await DB.prepare(
          'SELECT id FROM payments WHERE record_id=? AND account_id IS NOT NULL LIMIT 1',
        )
          .bind(recordId)
          .first()
      )
        throw new WorkError(
          'Este origen respalda pagos vinculados. Conserva el vínculo y registra una corrección para conciliación.',
        );
      await mutate([
        DB.prepare(
          'DELETE FROM person_sources WHERE record_id=? AND person_id=? AND (SELECT count(*) FROM person_sources WHERE person_id=?)>1',
        ).bind(recordId, personId, personId),
        history(personId, 'Vínculo retirado', { recordId }, null, reason, true),
      ]);
      return respond({ ok: true });
    }
    if (action === 'desk-lot') {
      admin();
      const personId = required(d.personId);
      await getPerson(personId);
      const name = required(d.name, 120).toUpperCase(),
        project = required(d.project, 120).toUpperCase(),
        contract = optional(d.contract, 150),
        reason = required(d.reason, 1500);
      if (d.id) {
        const lot = await DB.prepare(
          'SELECT * FROM lots WHERE id=? AND person_id=?',
        )
          .bind(d.id, personId)
          .first();
        if (!lot) throw new WorkError('Lote no encontrado.', 404);
        await mutate([
          DB.prepare(
            'UPDATE lots SET name=?,project=?,contract=?,version=version+1 WHERE id=? AND version=?',
          ).bind(name, project, contract, d.id, d.version),
          history(
            personId,
            'Lote corregido',
            lot,
            { name, project, contract },
            reason,
            true,
          ),
        ]);
        return respond({ id: d.id });
      }
      await DB.batch([
        DB.prepare(
          'INSERT INTO lots (id,person_id,name,project,contract) VALUES (?,?,?,?,?)',
        ).bind(id, personId, name, project, contract),
        history(
          personId,
          'Lote confirmado',
          null,
          { id, name, project, contract },
          reason,
        ),
      ]);
      return respond({ id });
    }
    const accountInfo = async (accountId: string) => {
      const a = await DB.prepare(
        'SELECT a.*,l.person_id,l.name AS lot_name FROM accounts a JOIN lots l ON a.lot_id=l.id WHERE a.id=?',
      )
        .bind(accountId)
        .first<{
          id: string;
          person_id: string;
          lot_name: string;
          lot_id: string;
          concept: string;
          agreed: number | null;
          opening: number;
          opening_confirmed: number;
          opening_date: string;
          version: number;
        }>();
      if (!a) throw new WorkError('Cuenta no encontrada.', 404);
      return a;
    };
    if (action === 'desk-account') {
      admin();
      const lotId = required(d.lotId),
        lot = await DB.prepare('SELECT person_id FROM lots WHERE id=?')
          .bind(lotId)
          .first<{ person_id: string }>();
      if (!lot) throw new WorkError('Lote no encontrado.');
      if (!concepts.includes(d.concept))
        throw new WorkError('Concepto inválido.');
      const agreed = centsInput(d.agreed, true),
        opening = centsInput(d.opening || '0')!,
        openingDate = optional(d.openingDate, 10),
        reason = required(d.reason, 1500);
      const openingConfirmed = d.openingConfirmed === true;
      if (!openingConfirmed && (opening !== 0 || openingDate))
        throw new WorkError(
          'Confirma el histórico para registrar un importe pagado anterior.',
        );
      if (
        opening > 0 &&
        (!validDay(openingDate) || openingDate >= todayLocal())
      )
        throw new WorkError(
          'El pago histórico requiere una fecha de corte anterior a hoy.',
        );
      if (opening === 0 && openingDate)
        throw new WorkError(
          'Deja la fecha de corte vacía si no hay pagos históricos.',
        );
      if (agreed !== null && (agreed <= 0 || opening > agreed))
        throw new WorkError('El importe acordado debe cubrir lo ya pagado.');
      if (d.id) {
        const a = await accountInfo(d.id);
        if (a.lot_id !== lotId || a.concept !== d.concept)
          throw new WorkError('No cambies el destino de una cuenta existente.');
        await mutate([
          DB.prepare(
            `UPDATE accounts SET agreed=?,opening=?,opening_confirmed=?,opening_date=?,evidence=?,version=version+1 WHERE id=? AND version=? AND (? IS NULL OR ? >= ? + COALESCE((SELECT SUM(cents) FROM payments WHERE account_id=? AND void_reason IS NULL),0)) AND (? IS NULL OR ? >= ? + COALESCE((SELECT SUM(cents) FROM installments WHERE account_id=?),0) + COALESCE((SELECT SUM(cents) FROM payments WHERE account_id=? AND installment_id IS NULL AND void_reason IS NULL),0)) AND NOT EXISTS(SELECT 1 FROM payments WHERE account_id=? AND void_reason IS NULL AND date<=?)`,
          ).bind(
            agreed,
            opening,
            openingConfirmed ? 1 : 0,
            openingDate,
            reason,
            a.id,
            d.version,
            agreed,
            agreed,
            opening,
            a.id,
            agreed,
            agreed,
            opening,
            a.id,
            a.id,
            a.id,
            openingDate,
          ),
          history(
            a.person_id,
            'Cuenta corregida',
            a,
            { agreed, opening, openingConfirmed, openingDate },
            reason,
            true,
          ),
        ]);
        return respond({ id: a.id });
      }
      await DB.batch([
        DB.prepare(
          'INSERT INTO accounts (id,lot_id,concept,agreed,opening,opening_confirmed,opening_date,evidence) VALUES (?,?,?,?,?,?,?,?)',
        ).bind(
          id,
          lotId,
          d.concept,
          agreed,
          opening,
          openingConfirmed ? 1 : 0,
          openingDate,
          reason,
        ),
        history(
          lot.person_id,
          'Cuenta confirmada',
          null,
          {
            id,
            lotId,
            concept: d.concept,
            agreed,
            opening,
            openingConfirmed,
            openingDate,
          },
          reason,
        ),
      ]);
      return respond({ id });
    }
    if (action === 'desk-plan') {
      admin();
      const a = await accountInfo(required(d.accountId));
      if (a.agreed === null || !a.opening_confirmed)
        throw new WorkError(
          'Confirma el importe acordado y el histórico pagado antes de programar cuotas.',
        );
      const paid = await DB.prepare(
        'SELECT COALESCE(SUM(cents),0) total FROM payments WHERE account_id=? AND void_reason IS NULL',
      )
        .bind(a.id)
        .first<{ total: number }>();
      const plan = monthlyPlan(
        a.agreed - a.opening - (paid?.total ?? 0),
        Number(d.count),
        d.firstDate,
      );
      const reason = required(d.reason, 1500);
      await mutate([
        DB.prepare(
          'UPDATE accounts SET version=version+1 WHERE id=? AND version=? AND NOT EXISTS(SELECT 1 FROM installments WHERE account_id=?)',
        ).bind(a.id, d.version, a.id),
        ...plan.map((p) =>
          DB.prepare(
            'INSERT INTO installments (id,account_id,due,cents) SELECT ?,?,?,? WHERE changes()=1',
          ).bind(crypto.randomUUID(), a.id, p.due, p.cents),
        ),
        history(a.person_id, 'Plan de cuotas', null, plan, reason, true),
      ]);
      return respond({ ok: true });
    }
    if (action === 'desk-due') {
      admin();
      const installment = await DB.prepare(
        'SELECT * FROM installments WHERE id=?',
      )
        .bind(required(d.installmentId))
        .first<{ id: string; account_id: string; due: string }>();
      if (!installment) throw new WorkError('Cuota no encontrada.', 404);
      const account = await accountInfo(installment.account_id),
        reason = required(d.reason, 1500);
      if (!validDay(d.due)) throw new WorkError('Revisa el vencimiento.');
      await mutate([
        DB.prepare(
          'UPDATE accounts SET version=version+1 WHERE id=? AND version=?',
        ).bind(account.id, d.version),
        DB.prepare(
          'UPDATE installments SET due=? WHERE id=? AND changes()=1',
        ).bind(d.due, installment.id),
        history(
          account.person_id,
          'Vencimiento corregido',
          installment,
          { due: d.due },
          reason,
          true,
        ),
      ]);
      return respond({ ok: true });
    }
    if (action === 'desk-payment') {
      const a = await accountInfo(required(d.accountId)),
        cents = centsInput(d.amount)!,
        reference = required(d.reference, 150),
        date = d.date,
        operation = required(d.operation, 100),
        installmentId = optional(d.installmentId, 100);
      if (
        !validDay(date) ||
        date > todayLocal() ||
        date <= a.opening_date ||
        cents <= 0
      )
        throw new WorkError(
          'Revisa el importe y la fecha. El abono debe ser posterior al corte histórico.',
        );
      const existing = await DB.prepare(
        'SELECT * FROM payments WHERE operation=?',
      )
        .bind(operation)
        .first();
      if (existing) {
        if (
          existing.account_id !== a.id ||
          existing.cents !== cents ||
          existing.reference !== reference ||
          existing.date !== date ||
          existing.installment_id !== (installmentId || null)
        )
          throw new WorkError('Esta operación ya tiene otros datos.', 409);
        return respond({ id: existing.id });
      }
      const source = await DB.prepare(
        'SELECT record_id FROM person_sources WHERE person_id=? ORDER BY record_id LIMIT 1',
      )
        .bind(a.person_id)
        .first<{ record_id: string }>();
      if (!source)
        throw new WorkError('Vincula primero el expediente original.');
      const hasPlan = await DB.prepare(
        'SELECT id FROM installments WHERE account_id=? LIMIT 1',
      )
        .bind(a.id)
        .first();
      if (hasPlan && !installmentId)
        throw new WorkError('Selecciona la cuota que estás cobrando.');
      if (
        installmentId &&
        !(await DB.prepare(
          'SELECT id FROM installments WHERE id=? AND account_id=?',
        )
          .bind(installmentId, a.id)
          .first())
      )
        throw new WorkError('La cuota no pertenece a esta cuenta.');
      await mutate([
        DB.prepare(
          `UPDATE accounts SET version=version+1 WHERE id=? AND version=? AND (agreed IS NULL OR agreed-opening-COALESCE((SELECT SUM(cents) FROM payments WHERE account_id=? AND void_reason IS NULL),0)>=?) AND (?='' OR (SELECT cents FROM installments WHERE id=?)-COALESCE((SELECT SUM(cents) FROM payments WHERE installment_id=? AND void_reason IS NULL),0)>=?)`,
        ).bind(
          a.id,
          d.version,
          a.id,
          cents,
          installmentId,
          installmentId,
          installmentId,
          cents,
        ),
        DB.prepare(
          'INSERT INTO payments (id,record_id,account_id,installment_id,concept,lot,cents,date,reference,author,created,operation) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE changes()=1',
        ).bind(
          id,
          source.record_id,
          a.id,
          installmentId || null,
          a.concept,
          a.lot_name,
          cents,
          date,
          reference,
          user.name,
          now,
          operation,
        ),
        history(
          a.person_id,
          'Pago registrado',
          null,
          {
            id,
            accountId: a.id,
            concept: a.concept,
            lot: a.lot_name,
            cents,
            date,
            reference,
            installmentId,
          },
          'Confirmado desde el resumen de pago',
          true,
        ),
      ]);
      return respond({ id });
    }
    if (action === 'desk-void') {
      admin();
      const reason = required(d.reason, 1500),
        paymentId = required(d.paymentId);
      const p = await DB.prepare('SELECT * FROM payments WHERE id=?')
        .bind(paymentId)
        .first();
      if (!p) throw new WorkError('Pago no encontrado.');
      const a = p.account_id ? await accountInfo(p.account_id as string) : null;
      const source = await DB.prepare(
        'SELECT person_id FROM person_sources WHERE record_id=?',
      )
        .bind(p.record_id)
        .first<{ person_id: string }>();
      const statements = [
        DB.prepare(
          'UPDATE payments SET void_reason=?,void_author=?,void_date=? WHERE id=? AND void_reason IS NULL',
        ).bind(reason, user.name, now, paymentId),
      ];
      if (a)
        statements.push(
          DB.prepare(
            'UPDATE accounts SET version=version+1 WHERE id=? AND changes()=1',
          ).bind(a.id),
        );
      if (a || source)
        statements.push(
          history(
            a?.person_id ?? source!.person_id,
            'Pago anulado',
            p,
            { void_reason: reason },
            reason,
            true,
          ),
        );
      await mutate(statements);
      return respond({ ok: true });
    }
    if (action === 'desk-assign') {
      admin();
      const a = await accountInfo(required(d.accountId)),
        reason = required(d.reason, 1500),
        p = await DB.prepare(
          'SELECT * FROM payments WHERE id=? AND account_id IS NULL AND void_reason IS NULL',
        )
          .bind(d.paymentId)
          .first();
      if (!p || p.concept !== a.concept || String(p.date) <= a.opening_date)
        throw new WorkError(
          'El abono no es compatible con esta cuenta o fecha de corte.',
        );
      if (
        !(await DB.prepare(
          'SELECT record_id FROM person_sources WHERE person_id=? AND record_id=?',
        )
          .bind(a.person_id, p.record_id)
          .first())
      )
        throw new WorkError('El abono pertenece a otro expediente.');
      if (
        await DB.prepare(
          'SELECT id FROM installments WHERE account_id=? LIMIT 1',
        )
          .bind(a.id)
          .first()
      )
        throw new WorkError(
          'Vincula los abonos anteriores antes de programar cuotas.',
        );
      await mutate([
        DB.prepare(
          'UPDATE accounts SET version=version+1 WHERE id=? AND version=? AND (agreed IS NULL OR agreed-opening-COALESCE((SELECT SUM(cents) FROM payments WHERE account_id=? AND void_reason IS NULL),0)>=?)',
        ).bind(a.id, d.version, a.id, p.cents),
        DB.prepare(
          'UPDATE payments SET account_id=? WHERE id=? AND account_id IS NULL AND changes()=1',
        ).bind(a.id, p.id),
        history(
          a.person_id,
          'Abono anterior vinculado',
          p,
          { accountId: a.id },
          reason,
          true,
        ),
      ]);
      return respond({ ok: true });
    }
    if (action === 'desk-task') {
      const personId = required(d.personId);
      await getPerson(personId);
      const reason = required(d.reason, 1500);
      if (d.id) {
        const before = await DB.prepare(
          'SELECT * FROM tasks WHERE id=? AND person_id=?',
        )
          .bind(d.id, personId)
          .first();
        if (!before) throw new WorkError('Gestión no encontrada.');
        await mutate([
          DB.prepare(
            'UPDATE tasks SET done=?,version=version+1 WHERE id=? AND version=?',
          ).bind(d.done ? 1 : 0, d.id, d.version),
          history(
            personId,
            d.done ? 'Gestión completada' : 'Gestión reabierta',
            before,
            { done: !!d.done },
            reason,
            true,
          ),
        ]);
        return respond({ ok: true });
      }
      if (
        !['Gestión pendiente', 'Compromiso de pago'].includes(d.kind) ||
        !validDay(d.due)
      )
        throw new WorkError('Revisa el tipo y la fecha.');
      const description = required(d.description, 3000),
        amount = d.kind === 'Compromiso de pago' ? centsInput(d.amount) : null;
      if (d.kind === 'Compromiso de pago' && (!amount || amount <= 0))
        throw new WorkError('Indica el importe comprometido.');
      await DB.batch([
        DB.prepare(
          'INSERT INTO tasks (id,person_id,kind,description,due,amount,author,created) VALUES (?,?,?,?,?,?,?,?)',
        ).bind(
          id,
          personId,
          d.kind,
          description,
          d.due,
          amount,
          user.name,
          now,
        ),
        history(
          personId,
          d.kind,
          null,
          { description, due: d.due, amount },
          reason,
        ),
      ]);
      return respond({ id });
    }
    throw new WorkError('Acción no encontrada.', 404);
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    if (e instanceof WorkError) return respond({ error: message }, e.status);
    if (message.includes('UNIQUE'))
      return respond(
        {
          error:
            'Ese registro, recibo o vínculo ya existe. Actualiza la ficha antes de continuar.',
        },
        409,
      );
    return respond(
      {
        error:
          e instanceof SyntaxError
            ? 'Datos inválidos.'
            : message.startsWith('Ingresa') || message.startsWith('Revisa')
              ? message
              : 'No se pudo guardar. Actualiza la ficha e inténtalo de nuevo.',
      },
      400,
    );
  }
}
