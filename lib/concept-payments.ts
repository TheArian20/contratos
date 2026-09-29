export const concepts = [
  'Lote',
  'Luz',
  'Agua',
  'Título',
  'Autovalúo',
  'Faenas',
  'Vías',
  'Otros servicios',
] as const;
export function paymentInput(data: Record<string, unknown>) {
  const amount =
    typeof data.amount === 'string' ? data.amount.trim().replace(',', '.') : '';
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(amount))
    throw new Error('Ingresa un importe positivo con hasta dos decimales.');
  const [whole, fractional = ''] = amount.split('.');
  const cents = Number(whole) * 100 + Number(fractional.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0)
    throw new Error('El importe debe ser mayor que cero.');
  if (!concepts.some((c) => c === data.concept))
    throw new Error('Selecciona el concepto al que corresponde el abono.');
  const date = typeof data.date === 'string' ? data.date : '';
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date > new Date().toISOString().slice(0, 10)
  )
    throw new Error('La fecha del pago no es válida.');
  const reference =
    typeof data.reference === 'string' ? data.reference.trim() : '';
  const lot = typeof data.lot === 'string' ? data.lot.trim() : '';
  if (!reference || reference.length > 150 || !lot || lot.length > 300)
    throw new Error(
      'Indica el recibo o referencia y el lote al que corresponde.',
    );
  return { cents, concept: data.concept as string, date, reference, lot };
}
