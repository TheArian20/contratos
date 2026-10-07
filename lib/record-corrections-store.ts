import type { Dataset } from './source-data';
export async function loadRecordCorrections(DB: D1Database) {
  type Correction = NonNullable<Dataset['corrections']>[string];
  const rows = await DB.prepare(
    "SELECT key,value FROM settings WHERE key LIKE 'record-correction:%'",
  ).all<{ key: string; value: string }>();
  const result: Record<string, Correction> = Object.fromEntries(
    rows.results.map((r) => [
      r.key.slice('record-correction:'.length),
      JSON.parse(r.value),
    ]),
  );
  // Older forms also saved an inherited Excel flag. Only an explicit debt
  // decision may survive a correction to the interpretation of source colors.
  const legacy = Object.values(result).some(
    (c) => c.debtConfirmed === undefined,
  );
  const explicit = new Set<string>();
  if (legacy) {
    const history = await DB.prepare(
      "SELECT target FROM audit WHERE action='record_corrected'",
    ).all<{ target: string }>();
    for (const row of history.results) {
      const h = JSON.parse(row.target);
      if (
        typeof h.after?.paidInFull === 'boolean' &&
        (!h.before || h.before.paidInFull !== h.after.paidInFull)
      )
        explicit.add(h.recordId);
    }
  }
  for (const [id, c] of Object.entries(result)) {
    c.debtConfirmed = c.debtConfirmed ?? explicit.has(id);
    if (!c.debtConfirmed) delete c.paidInFull;
  }
  return result;
}
