import { bindings } from '@/lib/server-store';
import { backupInfo, createStoredBackup } from '@/lib/backup-storage';
const toolList = [
  {
    name: 'cartera_crear_respaldo_diario',
    description:
      'Crea y verifica la copia privada diaria de Cartera. Reintentos del mismo día reutilizan la copia completa. Solo el propietario; devuelve metadatos, nunca datos personales ni archivos.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'cartera_estado_respaldos',
    description:
      'Consulta fechas y resultados de los respaldos privados de Cartera y su programación registrada.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'cartera_registrar_programacion_respaldo',
    description:
      'Registra la programación ya creada en Sites. Usar únicamente después de confirmar el ID y estado de la tarea; no crea la tarea ni cambia su horario.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        enabled: { type: 'boolean' },
        time: { type: 'string', description: 'HH:mm' },
        timezone: { type: 'string', enum: ['America/Bogota', 'America/Lima'] },
      },
      required: ['id', 'enabled', 'time', 'timezone'],
      additionalProperties: false,
    },
  },
];
export async function POST(request: Request) {
  const reply = (id: unknown, result: unknown) =>
    Response.json(
      { jsonrpc: '2.0', id, result },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  let input: {
    id?: unknown;
    method?: string;
    params?: { name?: string; arguments?: Record<string, unknown> };
  };
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 8192) throw new Error();
    input = JSON.parse(raw);
  } catch {
    return Response.json(
      { error: 'JSON inválido o demasiado grande' },
      { status: 400 },
    );
  }
  if (input.method === 'server/discover')
    return reply(input.id, {
      supportedVersions: ['2026-07-28'],
      capabilities: { tools: {} },
    });
  if (input.method === 'initialize')
    return reply(input.id, {
      protocolVersion: '2025-03-26',
      capabilities: { tools: {} },
      serverInfo: { name: 'cartera-backups', version: '1.0.0' },
    });
  if (input.method === 'notifications/initialized')
    return new Response(null, { status: 202 });
  if (input.method === 'tools/list')
    return reply(input.id, { tools: toolList });
  if (input.method !== 'tools/call')
    return Response.json({
      jsonrpc: '2.0',
      id: input.id,
      error: { code: -32601, message: 'Método no disponible' },
    });
  const { DB, FILES, BACKUP_OWNER_EMAIL } = bindings();
  const email = request.headers
    .get('oai-authenticated-user-email')
    ?.trim()
    .toLowerCase();
  if (
    !BACKUP_OWNER_EMAIL ||
    !email ||
    email !== BACKUP_OWNER_EMAIL.trim().toLowerCase() ||
    !request.headers.get('oai-authenticated-user-id')
  )
    return new Response('Solo el propietario autorizado', { status: 403 });
  try {
    let result: unknown;
    if (input.params?.name === 'cartera_crear_respaldo_diario')
      result = await createStoredBackup(
        DB,
        FILES,
        'daily',
        'sites-backup-owner',
      );
    else if (input.params?.name === 'cartera_estado_respaldos')
      result = await backupInfo(DB);
    else if (input.params?.name === 'cartera_registrar_programacion_respaldo') {
      const p = input.params.arguments ?? {};
      if (
        typeof p.id !== 'string' ||
        !p.id ||
        p.id.length > 200 ||
        typeof p.enabled !== 'boolean' ||
        typeof p.time !== 'string' ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time) ||
        !['America/Bogota', 'America/Lima'].includes(String(p.timezone))
      )
        throw new Error('Datos de programación inválidos.');
      const schedule = {
        id: p.id,
        enabled: p.enabled,
        time: p.time,
        timezone: p.timezone,
      };
      await DB.prepare(
        "INSERT INTO settings (key,value) VALUES ('backup-schedule',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
        .bind(JSON.stringify(schedule))
        .run();
      result = schedule;
    } else throw new Error('Herramienta no disponible.');
    return reply(input.id, {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      isError: false,
    });
  } catch {
    return reply(input.id, {
      content: [
        {
          type: 'text',
          text: 'No se completó la operación. Consulta el estado de respaldos y reintenta. No se modificaron los datos de trabajo.',
        },
      ],
      isError: true,
    });
  }
}
