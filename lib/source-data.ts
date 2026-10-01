export type RawCell = {
  value: string | number | boolean | null;
  type: string;
  style: string | null;
  formula: string | null;
  display?: string;
};
export type RawRow = { row: number; cells: Record<string, RawCell> };
export type RawSheet = {
  name: string;
  state: string;
  rows: RawRow[];
  merges: string[];
};
export type Dataset = {
  version: 1;
  sourceName: string;
  sourceHash: string;
  recordIds?: Record<string, string>;
  sheets: RawSheet[];
  styles?: Record<
    string,
    {
      fill?: string;
      color?: string;
      bold?: boolean;
      strike?: boolean;
      format?: string;
    }
  >;
};
export const clean = (value: string | number | boolean | null | undefined) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
export const coordinateColumn = (coordinate: string) =>
  coordinate.replace(/\d/g, '');
export const cellText = (cell?: RawCell) =>
  cell?.display ?? String(cell?.value ?? '');
export const groupNames = [
  'Persona y contacto',
  'Contrato y responsables',
  'Lotes y vivienda',
  'Cuotas y aportaciones',
  'Servicios y conceptos',
  'Observaciones',
  'Documentos y trámites',
  'Otros datos',
] as const;
export function fieldGroup(
  header: string,
  cell: RawCell,
): (typeof groupNames)[number] {
  const h = clean(header);
  if (/OBS|DESCRIPCION/.test(h)) return 'Observaciones';
  if (
    /\.PDF(?:$|\s)|\\|\.\.\//i.test(cellText(cell)) ||
    /NOTARI|ADENDA/.test(h)
  )
    return 'Documentos y trámites';
  if (
    /^LOTE$|TOTAL A COBRAR|LUZ|AGUA|TITULO|AUTOVALUO|FAENA|VIAS|SERVICIO/.test(
      h,
    )
  )
    return 'Servicios y conceptos';
  if (/CUOTA|^\d+[º°]|INSCRIP|INICIAL|MONTO|^S\/|PAGO|RECIBO/.test(h))
    return 'Cuotas y aportaciones';
  if (
    /LOTE|UBICACION|MZ|LTE|CASAS|PISOS|AREA|MEDIDA|DPTOS|PROYECCION|MODALIDAD/.test(
      h,
    )
  )
    return 'Lotes y vivienda';
  if (/NOMBRE|DNI|CELULAR|DIRECCION|E-MAIL|CIUDAD|DISTRITO|LOCALIDAD/.test(h))
    return 'Persona y contacto';
  if (
    /CONTRATO|SOCIO|PROMOTOR|VENDEDOR|CORREDOR|LIDER|PROMOCION|CONFRATERNIDAD|FECHA|F\/FINAL/.test(
      h,
    )
  )
    return 'Contrato y responsables';
  return 'Otros datos';
}
export const sections: Record<
  string,
  { category: string; description: string }
> = {
  Hoja1: {
    category: 'Casos especiales',
    description:
      'Personas retiradas de Ciudad de Dios. Sus ubicaciones, contratos y aportaciones se conservan como historial del proyecto.',
  },
  'Hoja 1': {
    category: 'Casos especiales',
    description:
      'Personas que ya no pertenecen a Ciudad de Dios. Se conserva su historial del proyecto.',
  },
  CHICLAYO: {
    category: 'Proyectos',
    description:
      'Socios, departamentos, contactos y cuotas registrados en Chiclayo.',
  },
  CASAS: {
    category: 'Proyectos',
    description:
      'Contratos de casas, manzanas, lotes, modalidades y aportaciones.',
  },
  'CASAS ALEMANAS': {
    category: 'Proyectos',
    description: 'Inscripciones, contratos, ubicación, área y cuotas de casas.',
  },
  'CIUDAD DE DIOS': {
    category: 'Proyectos',
    description:
      'Socios, contratos, lotes, viviendas y aportaciones del proyecto.',
  },
  'RESIDENCIAL DEL MALL': {
    category: 'Proyectos',
    description: 'Contratos, ubicaciones, promociones y cuotas registradas.',
  },
  'AA DATOS': {
    category: 'Proyectos',
    description:
      'Ubicaciones CV y PL, contratos y conceptos. TOTAL A COBRAR pendiente de definición.',
  },
  AA1: {
    category: 'Proyectos',
    description: 'Socios, manzanas, lotes, contactos y cuotas de la hoja AA1.',
  },
  AA2: {
    category: 'Proyectos',
    description: 'Recibos, personas, ubicaciones y cuotas de la hoja AA2.',
  },
  'REP. DOMINICANA': {
    category: 'Proyectos',
    description: 'Contratos, socios, inscripciones y cuotas de esta hoja.',
  },
  'SERVICIOS - CIUDAD DE DIOS': {
    category: 'Servicios y trámites',
    description:
      'Título, luz, agua y cuotas de servicios, separados del contrato del lote.',
  },
  Hoja2: {
    category: 'Servicios y trámites',
    description:
      'Socios, contratos, ubicación, notariado, servicios y título. Se conserva el nombre original.',
  },
  DEVOLUCIONES: {
    category: 'Casos especiales',
    description:
      'Registros y anotaciones de devoluciones. No implica devolución ejecutada.',
  },
  RETIRADOS: {
    category: 'Casos especiales',
    description:
      'Filas conservadas con sus coordenadas; faltan encabezados para asignar campos con certeza.',
  },
  'EXTREMA POBREZA': {
    category: 'Casos especiales',
    description:
      'Registros de la categoría original, inscripciones y aportaciones.',
  },
  'DONACIÓN A PASTORES': {
    category: 'Casos especiales',
    description: 'Registros de donaciones, lugares, medidas e inscripciones.',
  },
  DENUNCIANTES: {
    category: 'Casos especiales',
    description:
      'Anotaciones de la hoja original. Clasificación de columnas pendiente.',
  },
  'DESCRIPCION DE BASE DE DATOS': {
    category: 'Guía de la base',
    description:
      'Descripciones y leyenda original del Excel. No se usan para asignar automáticamente estados.',
  },
};
export function organizeSheet(sheet: RawSheet, sheetIndex: number) {
  const headerRow = sheet.rows
    .slice(0, 10)
    .find((r) =>
      Object.values(r.cells).some((c) =>
        clean(c.value).includes('NOMBRES Y APELLIDOS'),
      ),
    );
  const headers = Object.fromEntries(
    Object.entries(headerRow?.cells ?? {}).map(([coord, c]) => [
      coordinateColumn(coord),
      cellText(c),
    ]),
  );
  const rows = sheet.rows.map((row) => {
    const fields = Object.entries(row.cells).map(([coordinate, cell]) => {
      const column = coordinateColumn(coordinate);
      const header = headers[column] || `Columna ${column} · sin encabezado`;
      // Associate only an explicitly labeled FECHA immediately before a cuota.
      const cols = Object.keys(headers);
      const nextHeader = headers[cols[cols.indexOf(column) + 1]] || '';
      const group =
        clean(header) === 'FECHA' && /CUOTA|^\d+[º°]/.test(clean(nextHeader))
          ? 'Cuotas y aportaciones'
          : fieldGroup(header, cell);
      return { coordinate, header, cell, group };
    });
    const find = (pattern: RegExp) =>
      fields
        .filter((f) => pattern.test(clean(f.header)))
        .map((f) => cellText(f.cell).trim())
        .filter(Boolean)
        .join(' · ');
    const person =
      headerRow && row.row > headerRow.row ? find(/NOMBRES Y APELLIDOS/) : '';
    const document = person ? find(/DNI/) : '';
    return {
      id: `${sheetIndex}:${row.row}`,
      situation: recordSituation(sheet.name, row, !!person),
      row: row.row,
      fields,
      person,
      document,
      lot: person ? find(/UBICACION|MZ|^LTE$|LUGAR Y MEDIDA DE LOTE/) : '',
      contract: person ? find(/CONTRATO|SOCIO/) : '',
      kind:
        headerRow && row.row === headerRow.row
          ? 'Encabezado'
          : person
            ? 'Expediente'
            : 'Anotación de origen',
    };
  });
  return {
    ...sheet,
    index: sheetIndex,
    headers,
    headerRow: headerRow?.row,
    records: rows,
    ...sections[sheet.name],
    category: sections[sheet.name]?.category ?? 'Otras hojas',
    description:
      sections[sheet.name]?.description ??
      'Datos de la hoja original, pendientes de clasificación.',
  };
}
export type OrganizedSheet = ReturnType<typeof organizeSheet>;
export type SourceRecord = OrganizedSheet['records'][number];
export function recordKey(data: Dataset, record: { id: string }) {
  return data.recordIds?.[record.id] ?? `${data.sourceHash}:${record.id}`;
}
export function sheetTitle(name: string) {
  return /^HOJA\s*1$/.test(clean(name)) ? 'Retirados de Ciudad de Dios' : name;
}
export function recordSituation(
  sheetName: string,
  row: RawRow,
  hasPerson: boolean,
) {
  const sheet = clean(sheetName);
  if (sheet === 'DESCRIPCION DE BASE DE DATOS')
    return {
      retiredFromCiudad: false,
      noLot: false,
      complainant: false,
      noCollect: false,
      review: false,
      labels: [] as string[],
    };
  const values = Object.values(row.cells).map((c) => clean(c.value));
  const text = values.join(' | ');
  // Only explicit written statements or the owner's definition of Hoja1.
  // Colors, blank locations and threats of a future complaint do not set status.
  const retiredFromCiudad = hasPerson && /^HOJA\s*1$/.test(sheet);
  const noLot = /RESOLUCION SIN LOTES?\b/.test(text);
  const complainant =
    sheet === 'DENUNCIANTES' ||
    values.some(
      (v) =>
        /\bDENUNCIANTE(S)?\b|\bDENUNCIATES\b/.test(v) &&
        !/VA A?\s*DENUNCIAR|NO ES DENUNCIANTE/.test(v),
    );
  const noCollect = /\bNO COBRAR\b/.test(text);
  const review =
    /VA\s+(?:A\s+)?DENUNCIAR|SE RETIRARA|RETIRO VOLUNTARIO|\bRETIRAD[OA]\b|RETIRARSE|ANULADO/.test(
      text,
    ) || sheet === 'RETIRADOS';
  return {
    retiredFromCiudad,
    noLot,
    complainant,
    noCollect,
    review,
    labels: [
      retiredFromCiudad && 'Retirado de Ciudad de Dios',
      noLot && 'Sin lote vigente',
      complainant && 'Denunciante',
      noCollect && 'No cobrar',
      review && 'Revisión de administración',
    ].filter(Boolean) as string[],
  };
}
export function inspectDataset(data: Dataset) {
  if (
    data.version !== 1 ||
    !Array.isArray(data.sheets) ||
    !/^[a-f0-9]{64}$/.test(data.sourceHash)
  )
    throw new Error('Archivo de importación inválido.');
  const names = new Set<string>();
  return data.sheets.map((sheet) => {
    if (!sheet.name || names.has(sheet.name) || !Array.isArray(sheet.rows))
      throw new Error('Hojas duplicadas o inválidas.');
    names.add(sheet.name);
    const rows = new Set<number>();
    let cells = 0;
    for (const row of sheet.rows) {
      if (!Number.isInteger(row.row) || row.row < 1 || rows.has(row.row))
        throw new Error('Filas duplicadas o inválidas.');
      rows.add(row.row);
      for (const [coord, cell] of Object.entries(row.cells)) {
        if (
          !/^[A-Z]+[1-9]\d*$/.test(coord) ||
          Number(coord.replace(/[A-Z]/g, '')) !== row.row ||
          !cell ||
          !['string', 'number', 'boolean', 'object'].includes(
            typeof cell.value,
          ) ||
          (typeof cell.value === 'object' && cell.value !== null)
        )
          throw new Error('Coordenada o valor inválido.');
        cells++;
      }
    }
    return { name: sheet.name, rows: rows.size, cells };
  });
}
