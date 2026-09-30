import {
  clean,
  coordinateColumn,
  organizeSheet,
  recordKey,
  type Dataset,
  type RawRow,
} from './source-data.ts';

const family = (name: string) =>
  /^HOJA\s*1$/.test(clean(name)) ? 'CIUDAD DE DIOS' : clean(name);
const fingerprint = (row: RawRow) =>
  JSON.stringify(
    Object.entries(row.cells)
      .filter(([, c]) => c.value !== null || c.formula)
      .map(([k, c]) => [coordinateColumn(k), c.value, c.formula])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  );

export function reconcileDataset(previous: Dataset, incoming: Dataset) {
  if (previous.sourceHash === incoming.sourceHash)
    throw new Error('Este archivo ya es la versión actual.');
  const flatten = (data: Dataset) =>
    data.sheets.flatMap((s, i) => {
      const organized = organizeSheet(s, i);
      return organized.records.map((r, index) => ({
        id: r.id,
        key: recordKey(data, r),
        sheet: s.name,
        row: r.row,
        exact: `${family(s.name)}:${fingerprint(s.rows[index])}`,
        // A name alone never proves continuity. Require DNI, name and contract.
        identity:
          r.document && r.person && r.contract
            ? JSON.stringify([
                family(s.name),
                clean(r.document),
                clean(r.person),
                clean(r.contract),
              ])
            : '',
        situation: r.situation,
      }));
    });
  const before = flatten(previous),
    after = flatten({ ...incoming, recordIds: undefined });
  const used = new Set<string>(),
    assigned = new Set<string>();
  const recordIds: Record<string, string> = {};
  let unchanged = 0,
    changed = 0,
    moved = 0;
  for (const mode of ['exact', 'identity'] as const) {
    const oldGroups = new Map<string, typeof before>(),
      newGroups = new Map<string, typeof after>();
    for (const r of before)
      if (!used.has(r.id) && r[mode])
        oldGroups.set(r[mode], [...(oldGroups.get(r[mode]) ?? []), r]);
    for (const r of after)
      if (!assigned.has(r.id) && r[mode])
        newGroups.set(r[mode], [...(newGroups.get(r[mode]) ?? []), r]);
    for (const [key, rows] of newGroups) {
      const old = oldGroups.get(key);
      if (rows.length !== 1 || old?.length !== 1) continue;
      const current = rows[0],
        prior = old[0];
      recordIds[current.id] = prior.key;
      assigned.add(current.id);
      used.add(prior.id);
      if (mode === 'exact') unchanged++;
      else changed++;
      if (current.sheet !== prior.sheet) moved++;
    }
  }
  const summary = {
    previousName: previous.sourceName,
    nextName: incoming.sourceName,
    previousHash: previous.sourceHash,
    nextHash: incoming.sourceHash,
    unchanged,
    changed,
    moved,
    newOrUnmatched: after.length - assigned.size,
    archivedUnmatched: before.length - used.size,
    noLot: after.filter((r) => r.situation.noLot).length,
    complainants: after.filter((r) => r.situation.complainant).length,
    noCollect: after.filter((r) => r.situation.noCollect).length,
    sheets: incoming.sheets.map((s) => ({ name: s.name, rows: s.rows.length })),
  };
  return { data: { ...incoming, recordIds }, summary };
}
export type UpdateSummary = ReturnType<typeof reconcileDataset>['summary'];
