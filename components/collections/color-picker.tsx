'use client';
import { useId } from 'react';
import { recordColors, colorLabel, colorMeaning } from '@/lib/record-colors';
import { ColorLegend } from './color-legend';
export function ColorPicker({
  value,
  onChange,
  disabled = false,
  allowPink = true,
  project = '',
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allowPink?: boolean;
  project?: string;
}) {
  const group = useId();
  return (
    <>
      <fieldset className="color-picker" disabled={disabled}>
        <legend>Colores del Excel</legend>
        <div>
          {recordColors.map((c) => (
            <label
              key={c.value}
              className={value === c.value ? 'selected' : ''}
            >
              <input
                type="radio"
                name={group}
                value={c.value}
                checked={value === c.value}
                disabled={c.value === 'pink' && !allowPink}
                onChange={() => onChange(c.value)}
              />
              <span
                aria-hidden="true"
                style={{
                  background:
                    c.hex || (c.value === 'text-white' ? '#526678' : '#fff'),
                  color: c.fg,
                }}
              >
                {c.value.startsWith('text-') || c.value === 'green-red'
                  ? 'Ab'
                  : ''}
              </span>
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      <p role="status">
        <strong>{colorLabel(value)}:</strong>{' '}
        {project
          ? colorMeaning(value, project)
          : 'Selecciona un proyecto para ver su significado.'}
        {project && <> · Proyecto: {project}.</>}
      </p>
      <p>
        La etiqueta describe el seguimiento. Consulta los pagos y saldos por
        lote; cambiar el color no registra un pago.
      </p>
      <ColorLegend />
    </>
  );
}
