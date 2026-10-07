'use client';
import { useId } from 'react';
import { recordColors, colorLegends, colorLabel } from '@/lib/record-colors';
export function ColorPicker({
  value,
  onChange,
  disabled = false,
  allowPink = true,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allowPink?: boolean;
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
      <details className="color-legend">
        <summary>Ver leyenda del Excel</summary>
        {Object.entries(colorLegends).map(([section, rows]) => (
          <section key={section}>
            <h4>{section}</h4>
            <dl>
              {rows.map(([color, text]) => (
                <div key={color}>
                  <dt>{colorLabel(color)}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <p>
          Rosado: sin deuda solo en Ciudad de Dios, según la indicación de
          Administración. En las demás secciones es una etiqueta.
        </p>
        <p>
          Las etiquetas conservan la referencia visual del Excel. Cambiar un
          color no registra pagos ni modifica importes.
        </p>
      </details>
    </>
  );
}
