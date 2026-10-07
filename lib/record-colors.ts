export const recordColors = [
  { value: '', label: 'Sin color', hex: '', fg: '#172b3a' },
  { value: 'green', label: 'Verde', hex: '#A9CE91', fg: '#172b3a' },
  {
    value: 'green-red',
    label: 'Verde con texto rojo',
    hex: '#A9CE91',
    fg: '#FF0000',
  },
  { value: 'text-red', label: 'Texto rojo', hex: '', fg: '#FF0000' },
  { value: 'purple', label: 'Morado', hex: '#CC99FF', fg: '#172b3a' },
  { value: 'black', label: 'Negro', hex: '#000000', fg: '#FFFFFF' },
  { value: 'red', label: 'Rojo', hex: '#FF0000', fg: '#FFFFFF' },
  { value: 'cyan', label: 'Celeste', hex: '#66FFFF', fg: '#172b3a' },
  { value: 'yellow', label: 'Amarillo', hex: '#FFE699', fg: '#172b3a' },
  { value: 'blue', label: 'Azul', hex: '#6699FF', fg: '#172b3a' },
  { value: 'text-white', label: 'Texto blanco', hex: '', fg: '#FFFFFF' },
  { value: 'lime', label: 'Verde limón', hex: '#CCFF66', fg: '#172b3a' },
  { value: 'pink', label: 'Rosado', hex: '#FF99CC', fg: '#172b3a' },
] as const;
export const colorLabel = (color?: string) =>
  recordColors.find((c) => c.value === color)?.label ?? 'Sin color';
export const colorHex = (color?: string) =>
  recordColors.find((c) => c.value === color)?.hex || undefined;
export const colorStyle = (color?: string) => {
  const c = recordColors.find((c) => c.value === color);
  return c?.value
    ? {
        background: c.hex || undefined,
        color: c.value === 'text-white' ? undefined : c.fg,
      }
    : undefined;
};
export const validColor = (value: unknown): value is string =>
  typeof value === 'string' && recordColors.some((c) => c.value === value);
export const pinkMeansPaid = (sheet: string) =>
  sheet.trim().toUpperCase() === 'CIUDAD DE DIOS';
export const colorLegends = {
  Casas: [
    ['green', 'Cancelaron totalidad'],
    ['green-red', 'Solicitud de devolución: revisar expediente'],
    ['text-red', 'Solicitud de devolución: revisar expediente'],
    ['purple', 'Inscripción de casa en Urb. Aposento Alto'],
    ['black', 'Para resolución de contrato'],
    ['red', 'Observación / denunciante: consultar a Gerencia o Administración'],
    [
      'cyan',
      'Acuerdo de lote por aportación en Ciudad de Dios o Urb. Aposento Alto',
    ],
  ],
  'Ciudad de Dios / Servicios': [
    ['green', 'Cancelaron totalidad'],
    ['green-red', 'Solicitud de devolución: revisar expediente'],
    ['text-red', 'Solicitud de devolución: revisar expediente'],
    ['black', 'Para resolución de contrato'],
    [
      'yellow',
      'Observación / denunciante: consultar a Gerencia o Administración',
    ],
    [
      'blue',
      'Gerencia anuló el acuerdo de lote por aportación: consultar cada caso',
    ],
    [
      'text-white',
      'Casilla con número en blanco: no tiene contrato o transacción extrajudicial firmada',
    ],
    ['red', 'Contrato anulado: revisar expediente'],
    ['', 'En blanco: sigue pagando o no ha cancelado'],
    ['lime', 'Donación o acuerdo interno con Gerencia: revisar expediente'],
  ],
} as const;
