'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const UNSAVED_CHANGES_MESSAGE =
  'You have unsaved changes. Are you sure you want to leave?';

export function useUnsavedChanges(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = UNSAVED_CHANGES_MESSAGE;
      return UNSAVED_CHANGES_MESSAGE;
    };

    const handleLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target || anchor.download) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleLinkClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [enabled]);
}

export function useUnsavedDialogGuard(isDirty: boolean, onDiscard: () => void) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  useUnsavedChanges(isDirty);

  const requestClose = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) return true;
      if (!isDirty) {
        onDiscard();
        return true;
      }
      setConfirmOpen(true);
      return false;
    },
    [isDirty, onDiscard],
  );

  const discardChanges = useCallback(() => {
    setConfirmOpen(false);
    onDiscard();
  }, [onDiscard]);

  return { confirmOpen, setConfirmOpen, requestClose, discardChanges };
}

export function useFormDirtyState<T extends HTMLFormElement>() {
  const formRef = useRef<T>(null);
  const initialValueRef = useRef('');
  const [isDirty, setIsDirty] = useState(false);

  const snapshot = useCallback(() => {
    const form = formRef.current;
    if (!form) return '';
    const data = new FormData(form);
    return JSON.stringify(Array.from(data.entries()));
  }, []);

  const resetDirtyState = useCallback(() => {
    initialValueRef.current = snapshot();
    setIsDirty(false);
  }, [snapshot]);

  const updateDirtyState = useCallback(() => {
    setIsDirty(snapshot() !== initialValueRef.current);
  }, [snapshot]);

  useEffect(() => {
    resetDirtyState();
  }, [resetDirtyState]);

  useUnsavedChanges(isDirty);

  return { formRef, isDirty, resetDirtyState, updateDirtyState, setIsDirty };
}
