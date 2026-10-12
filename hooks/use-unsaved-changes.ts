'use client';
import { useEffect, useRef } from 'react';

/** Protect drafts on browser exit and on navigation explicitly marked by the UI. */
export function useUnsavedChanges(
  dirty: boolean,
  busy = false,
  onDiscard?: () => void,
) {
  const current = useRef({ dirty, busy, onDiscard });
  current.current = { dirty, busy, onDiscard };
  const canLeave = () => {
    if (current.current.busy) return false;
    if (!current.current.dirty) return true;
    if (
      !window.confirm(
        'Tienes cambios sin guardar. ¿Quieres salir y descartarlos?',
      )
    )
      return false;
    current.current.dirty = false;
    current.current.onDiscard?.();
    return true;
  };
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (current.current.dirty || current.current.busy) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const isNavigation = (e: Event) => {
      const target = e.target instanceof Element ? e.target : null;
      return (
        !!target?.closest('button,a,[role="tab"]') &&
        !!target.closest('[data-navigation]') &&
        !target.closest('[role="tab"][aria-selected="true"]')
      );
    };
    // Tabs can activate on pointer down, before a click reaches React.
    let pointerDecision: boolean | undefined;
    const pointer = (e: PointerEvent) => {
      pointerDecision = undefined;
      if (!isNavigation(e)) return;
      pointerDecision = canLeave();
      if (!pointerDecision) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    const navigate = (e: MouseEvent) => {
      if (!isNavigation(e)) {
        pointerDecision = undefined;
        return;
      }
      const allowed = pointerDecision ?? canLeave();
      pointerDecision = undefined;
      if (!allowed) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    const keyboardTab = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (
        ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) &&
        target?.closest('[role="tab"]') &&
        target.closest('[data-navigation]') &&
        !canLeave()
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('click', navigate, true);
    document.addEventListener('keydown', keyboardTab, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('click', navigate, true);
      document.removeEventListener('keydown', keyboardTab, true);
    };
  }, []);
  return {
    canLeave,
    markSaved: () => {
      current.current.dirty = false;
      current.current.busy = false;
    },
  };
}
