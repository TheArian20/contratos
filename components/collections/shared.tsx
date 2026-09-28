'use client';

import { BriefcaseBusiness } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-symbol">
        <BriefcaseBusiness size={23} />
      </span>
      <div>
        Cartera<span>CONTRATOS Y COBRANZAS</span>
      </div>
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    'Al día': 'current',
    Vencido: 'late',
    'Acuerdo de pago': 'agreement',
    Finalizado: 'closed',
  };
  return (
    <span className={`status-badge ${tones[status] ?? 'closed'}`}>
      <span />
      {status}
    </span>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
  id,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  id?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(value) => {
        if (value !== null) onChange(value);
      }}
    >
      <SelectTrigger id={id} className="status-select" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'No se pudo completar la acción. Inténtalo de nuevo.';
