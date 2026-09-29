export type SourceCell = string | number | boolean | Date | null;
export type SourceSheet = { sheet: string; data: SourceCell[][] };
export const reviewText = (value: SourceCell | undefined): string =>
  value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value ?? '').trim();
const key = (value: SourceCell | undefined) =>
  reviewText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
export function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}
export function reviewSheet(source: SourceSheet) {
  const headerIndex = source.data
    .slice(0, 10)
    .findIndex((row) =>
      row.some((cell) => key(cell).includes('NOMBRES Y APELLIDOS')),
    );
  const headers = headerIndex < 0 ? [] : source.data[headerIndex];
  const personIndex = headers.findIndex((cell) =>
    key(cell).includes('NOMBRES Y APELLIDOS'),
  );
  const documentIndex = headers.findIndex((cell) => key(cell).includes('DNI'));
  const lotIndexes = headers.flatMap((cell, index) =>
    /UBICACION|MZ|^LTE$|LUGAR Y MEDIDA DE LOTE/.test(key(cell)) ? [index] : [],
  );
  const rows = source.data.flatMap((cells, index) => {
    if (index <= headerIndex || !cells.some((cell) => reviewText(cell)))
      return [];
    return [
      {
        row: index + 1,
        cells,
        person: reviewText(cells[personIndex]),
        document: reviewText(cells[documentIndex]),
        lot: lotIndexes
          .map((i) =>
            reviewText(cells[i])
              ? `${reviewText(headers[i])}: ${reviewText(cells[i])}`
              : '',
          )
          .filter(Boolean)
          .join(' · '),
      },
    ];
  });
  return { name: source.sheet, headers, recognized: headerIndex >= 0, rows };
}
