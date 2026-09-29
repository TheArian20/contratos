import type {
  Account,
  Person,
  Lot,
  LedgerPayment,
  WorkTask,
} from '@/lib/work-ledger';
export type Candidate = {
  id: string;
  sheet: number;
  row: number;
  name: string;
  document: string;
  lot: string;
  contract: string;
  project: string;
};
export type WorkModal = {
  kind: string;
  person?: Person;
  lot?: Lot;
  account?: Account;
  payment?: LedgerPayment;
  task?: WorkTask;
  candidate?: Candidate;
  recordId?: string;
  installment?: { id: string; due: string };
};
export type WorkSave = (
  path: string,
  data: unknown,
) => Promise<{ id?: string }>;
export async function workCall<T = unknown>(path: string, data?: unknown) {
  const response = await fetch(`/api/secure/${path}`, {
    method: data === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(result.error || 'No se pudo completar la operación.');
  return result;
}
export const workError = (e: unknown) =>
  e instanceof Error ? e.message : 'No se pudo completar la operación.';
