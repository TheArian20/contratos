'use client';
import { Children, isValidElement, useState, type ReactNode } from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
function labelText(children: ReactNode): string {
  return Children.toArray(children)
    .map((c) =>
      typeof c === 'string' || typeof c === 'number'
        ? String(c)
        : isValidElement<{ children?: ReactNode }>(c)
          ? labelText(c.props.children)
          : '',
    )
    .join('');
}
export function WorkSelect({
  children,
  name,
  value,
  defaultValue,
  onChange,
  required = false,
  id,
}: {
  children: ReactNode;
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: { target: { value: string } }) => void;
  required?: boolean;
}) {
  const options = Children.toArray(children)
    .filter(isValidElement<{ value?: string; children?: ReactNode }>)
    .map((c) => ({
      value: c.props.value ?? labelText(c.props.children),
      label: labelText(c.props.children),
    }));
  const [local, setLocal] = useState(defaultValue ?? options[0]?.value ?? '');
  const selected = value ?? local;
  return (
    <Select
      name={name}
      value={selected}
      required={required}
      onValueChange={(next) => {
        if (next !== null) {
          setLocal(next);
          onChange?.({ target: { value: next } });
        }
      }}
    >
      <SelectTrigger
        id={id}
        className="work-select"
        aria-label={id ? undefined : 'Seleccionar opción'}
      >
        <SelectValue>
          {options.find((o) => o.value === selected)?.label ??
            'Selecciona una opción'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
