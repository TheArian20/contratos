'use client';
import { useId } from 'react';
import { recordColors } from '@/lib/record-colors';
import { ColorLegend } from './color-legend';
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
      <ColorLegend />
    </>
  );
}
