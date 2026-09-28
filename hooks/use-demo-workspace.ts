'use client';

import { useEffect, useRef, useState } from 'react';
import {
  type Contract,
  type DemoUser,
  type DocumentCategory,
  type Payment,
  addPayment,
  authenticateDemo,
  documentCategories,
  today,
  validateContract,
  validateUser,
  visibleContracts,
} from '@/lib/collections';
import { attachmentMime, validateAttachments } from '@/lib/attachments';
import { demoContracts } from '@/lib/demo/contracts';
import { demoUsers } from '@/lib/demo/users';

interface DemoState {
  contracts: Contract[];
  users: DemoUser[];
  sessionId: string | null;
}

/** All demo data lives in memory, isolated to this browser tab. Not real authentication. */
export function useDemoWorkspace() {
  const [state, setState] = useState<DemoState>({
    contracts: demoContracts,
    users: demoUsers,
    sessionId: 'demo-admin',
  });
  const current = useRef(state);
  const objectUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const commit = (next: DemoState) => {
    current.current = next;
    setState(next);
  };
  const actor = () => {
    const user = current.current.users.find(
      (user) => user.id === current.current.sessionId && user.active,
    );
    if (!user) throw new Error('Ingresa a la demostración para continuar.');
    return user;
  };
  const admin = () => {
    const user = actor();
    if (user.role !== 'Administrador')
      throw new Error('Esta acción requiere el rol Administrador.');
    return user;
  };
  const writableContract = (id: string) => {
    const user = actor();
    const contract = visibleContracts(current.current.contracts, user).find(
      (contract) => contract.id === id,
    );
    if (!contract || user.role === 'Consulta')
      throw new Error('Tu rol no permite modificar este contrato.');
    return contract;
  };
  const replace = (contract: Contract) =>
    commit({
      ...current.current,
      contracts: current.current.contracts.map((item) =>
        item.id === contract.id ? contract : item,
      ),
    });

  return {
    ...state,
    user:
      state.users.find((user) => user.id === state.sessionId && user.active) ??
      null,
    login(username: string, password: string) {
      const user = authenticateDemo(current.current.users, username, password);
      commit({ ...current.current, sessionId: user.id });
    },
    logout() {
      commit({ ...current.current, sessionId: null });
    },
    saveContract(draft: Contract) {
      admin();
      validateContract(draft);
      if (
        !current.current.users.some(
          (user) =>
            user.name === draft.owner &&
            user.active &&
            user.role !== 'Consulta',
        )
      )
        throw new Error(
          'Selecciona un responsable activo que pueda gestionar contratos.',
        );
      if (draft.id) {
        const existing = current.current.contracts.find(
          (contract) => contract.id === draft.id,
        );
        if (!existing) throw new Error('No encontramos ese contrato.');
        const updated = {
          ...draft,
          paid: existing.paid,
          payments: existing.payments,
          notes: existing.notes,
          attachments: existing.attachments,
        };
        validateContract(updated);
        replace(updated);
        return updated.id;
      }
      const ids = new Set(
        current.current.contracts.map((contract) => contract.id),
      );
      let next = current.current.contracts.length + 1;
      while (ids.has(`EXT-2026-${String(next).padStart(3, '0')}`)) next++;
      const contract = {
        ...draft,
        id: `EXT-2026-${String(next).padStart(3, '0')}`,
      };
      commit({
        ...current.current,
        contracts: [...current.current.contracts, contract],
      });
      return contract.id;
    },
    pay(id: string, payment: Omit<Payment, 'id' | 'author'>) {
      const contract = writableContract(id);
      replace(
        addPayment(contract, {
          ...payment,
          id: crypto.randomUUID(),
          author: actor().name,
        }),
      );
    },
    addNote(id: string, text: string) {
      const contract = writableContract(id);
      if (!text.trim() || text.length > 1500)
        throw new Error('Escribe una gestión de entre 1 y 1500 caracteres.');
      replace({
        ...contract,
        notes: [
          ...(contract.notes ?? []),
          {
            id: crypto.randomUUID(),
            text: text.trim(),
            date: today(),
            author: actor().name,
          },
        ],
      });
    },
    attach(id: string, files: File[], category: DocumentCategory) {
      const contract = writableContract(id);
      if (!documentCategories.includes(category))
        throw new Error('Selecciona un tipo de documento válido.');
      const size = current.current.contracts.reduce(
        (sum, c) =>
          sum +
          (c.attachments ?? []).reduce((bytes, file) => bytes + file.size, 0),
        0,
      );
      validateAttachments(files, size);
      const added: NonNullable<Contract['attachments']> = [];
      try {
        for (const file of files) {
          const url = URL.createObjectURL(
            new Blob([file], { type: attachmentMime(file.name) }),
          );
          objectUrls.current.add(url);
          added.push({
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            url,
            category,
          });
        }
        replace({
          ...contract,
          attachments: [...(contract.attachments ?? []), ...added],
        });
      } catch (error) {
        for (const file of added) {
          URL.revokeObjectURL(file.url);
          objectUrls.current.delete(file.url);
        }
        throw error;
      }
    },
    removeAttachment(id: string, attachmentId: string) {
      const contract = writableContract(id);
      const attachment = contract.attachments?.find(
        (file) => file.id === attachmentId,
      );
      if (!attachment) throw new Error('El archivo ya no está disponible.');
      replace({
        ...contract,
        attachments: contract.attachments?.filter(
          (file) => file.id !== attachmentId,
        ),
      });
      URL.revokeObjectURL(attachment.url);
      objectUrls.current.delete(attachment.url);
    },
    saveUser(user: DemoUser) {
      admin();
      validateUser(user, current.current.users);
      if (
        user.id === current.current.sessionId &&
        (!user.active || user.role !== 'Administrador')
      )
        throw new Error(
          'No puedes desactivar ni quitar el rol de administrador de tu propia sesión.',
        );
      if (
        current.current.users.some(
          (item) =>
            item.id !== user.id &&
            item.name.toLowerCase() === user.name.toLowerCase(),
        )
      )
        throw new Error(
          'Ya hay una persona con ese nombre. Usa un nombre que permita distinguirla.',
        );
      const previous = current.current.users.find(
        (item) => item.id === user.id,
      );
      const users = previous
        ? current.current.users.map((item) =>
            item.id === user.id ? user : item,
          )
        : [...current.current.users, user];
      const contracts = previous
        ? current.current.contracts.map((contract) =>
            contract.owner === previous.name
              ? { ...contract, owner: user.name }
              : contract,
          )
        : current.current.contracts;
      commit({ ...current.current, users, contracts });
    },
  };
}
