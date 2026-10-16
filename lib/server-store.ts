import { env } from 'cloudflare:workers';
export function bindings() {
  const values = env as unknown as {
    DB: D1Database;
    FILES: R2Bucket;
    SETUP_TOKEN?: string;
    BACKUP_OWNER_EMAIL?: string;
  };
  if (!values.DB || !values.FILES)
    throw new Error('Almacenamiento no disponible.');
  return values;
}
