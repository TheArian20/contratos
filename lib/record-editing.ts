import type { SourceRecord } from './source-data';
import { colorLabel, validColor } from './record-colors.ts';

export const editFields = [
  { key: 'name', label: 'Nombre completo / titulares', max: 250 },
  { key: 'document', label: 'DNI / identificación', max: 80 },
  { key: 'phone', label: 'Teléfono', max: 80 },
  { key: 'address', label: 'Dirección', max: 300 },
  { key: 'project', label: 'Proyecto', max: 150 },
  { key: 'location', label: 'Ubicación completa del terreno', max: 250 },
  { key: 'block', label: 'Manzana', max: 80 },
  { key: 'plot', label: 'Lote', max: 80 },
  { key: 'contract', label: 'Número de contrato / socio', max: 150 },
] as const;
export type EditKey = (typeof editFields)[number]['key'];
export type EditValues = Record<EditKey, string> & {
  paidInFull: boolean;
  color?: string;
};
export function recordValues(record: SourceRecord): EditValues {
  return {
    name: record.person,
    document: record.document,
    phone: record.phone,
    address: record.address,
    project: record.project,
    location: record.lot,
    block: record.block,
    plot: record.plot,
    contract: record.contract,
    paidInFull: record.situation.paidInFull,
    color: record.color,
  };
}
export function editDifferences(
  before: Partial<EditValues>,
  after: Partial<EditValues>,
) {
  const rows: { label: string; before: string; after: string }[] = editFields
    .filter((f) => after[f.key] !== undefined && before[f.key] !== after[f.key])
    .map((f) => ({
      label: f.label,
      before: before[f.key] || 'Sin dato',
      after: after[f.key] || 'Sin dato',
    }));
  if (after.paidInFull !== undefined && before.paidInFull !== after.paidInFull)
    rows.push({
      label: 'Estado de deuda',
      before: before.paidInFull ? 'Sin deuda' : 'Por revisar',
      after: after.paidInFull ? 'Sin deuda' : 'Por revisar',
    });
  if (after.color !== undefined && before.color !== after.color)
    rows.push({
      label: 'Color de etiqueta',
      before: colorLabel(before.color),
      after: colorLabel(after.color),
    });
  return rows;
}
export function validateEdit(
  input: Record<string, unknown>,
  before: EditValues,
  admin: boolean,
): EditValues {
  const result = { ...before };
  if (input.color !== undefined) {
    if (!validColor(input.color))
      throw new Error('Selecciona un color válido.');
    result.color = input.color;
  }
  for (const field of editFields) {
    const value = input[field.key];
    if (typeof value !== 'string' || value.trim().length > field.max)
      throw new Error(`Revisa el campo ${field.label}.`);
    result[field.key] = value.trim();
  }
  if (!result.name) throw new Error('Escribe el nombre completo.');
  if (typeof input.paidInFull !== 'boolean')
    throw new Error('Selecciona el estado de deuda.');
  if (!admin && input.paidInFull !== before.paidInFull)
    throw new Error('Solo Administración puede cambiar el estado de deuda.');
  result.paidInFull = input.paidInFull;
  return result;
}
