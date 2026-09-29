'use client';

import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { type Contract, filterContracts, statuses } from '@/lib/collections';

interface ModelContext {
  registerTool(
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ): void | Promise<void>;
}

/** Optional browser integration; the ordinary UI works without it. */
export function useContractTools(
  contracts: Contract[],
  showResults: (query: string, status: string) => void,
) {
  const current = useRef({ contracts, showResults });
  useEffect(() => {
    current.current = { contracts, showResults };
  }, [contracts, showResults]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'show_contract_search',
            description:
              'Filtra los contratos de demostración por nombre, identificación, lote o número y muestra los resultados en la pantalla de contratos.',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                status: { type: 'string', enum: ['Todos', ...statuses] },
              },
              required: ['query', 'status'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: true },
            execute(input) {
              if (!input || typeof input !== 'object')
                throw new Error('Se requiere una búsqueda y un estado.');
              const values = input as Record<string, unknown>;
              if (
                typeof values.query !== 'string' ||
                typeof values.status !== 'string' ||
                !['Todos', ...statuses].includes(values.status) ||
                Object.keys(values).some(
                  (key) => !['query', 'status'].includes(key),
                )
              )
                throw new Error('La búsqueda o el estado no son válidos.');
              const results = filterContracts(
                current.current.contracts,
                values.query,
                values.status,
              );
              flushSync(() =>
                current.current.showResults(
                  values.query as string,
                  values.status as string,
                ),
              );
              return {
                demo: true,
                count: results.length,
                contracts: results.map(({ id, client, status }) => ({
                  id,
                  client,
                  status,
                })),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {
        /* Optional capability unavailable. */
      });
    } catch {
      /* Browsers without registry support retain the ordinary UI. */
    }
    return () => lifecycle.abort();
  }, []);
}
