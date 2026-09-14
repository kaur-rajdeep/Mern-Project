import { useCallback, useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';

interface UseNavigationGuardOptions {
  /**
   * When `true`, the navigation guard is active.
   * Set this to `true` whenever the user has unsaved changes.
   */
  isDirty: boolean;
  /**
   * Optional: called after the user confirms they want to discard changes.
   * Use this to clear localStorage drafts or reset any state.
   */
  onDiscard?: () => void;
  /**
   * Optional: called when the user chooses to save changes and proceed.
   */
  onSave?: () => Promise<void> | void;
}

interface UseNavigationGuardReturn {
  /** Whether the guard dialog should be shown */
  isGuardOpen: boolean;
  /** Call to confirm navigation with discard (clears draft / resets state) */
  confirmNavigation: () => void;
  /** Call to cancel navigation (stay on page) */
  cancelNavigation: () => void;
  /** Call to directly proceed navigation without discarding (e.g. after draft save) */
  proceedNavigation: () => void;
  /** Call to execute onSave and proceed navigation once saved */
  saveAndNavigate: () => Promise<void>;
  /** Whether onSave is currently saving */
  isSaving: boolean;
}

/**
 * Navigation guard hook — blocks React Router navigation and browser unload
 * when the user has unsaved changes.
 *
 * Works with React Router v6.4+ `useBlocker`.
 */
export function useNavigationGuard({
  isDirty,
  onDiscard,
  onSave,
}: UseNavigationGuardOptions): UseNavigationGuardReturn {
  const [isSaving, setIsSaving] = useState(false);

  // --- React Router in-app navigation blocker ---
  // If isDirty is false, pass false so React Router completely deactivates blocking
  const shouldBlock = useCallback(
    ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
      Boolean(isDirty && currentLocation.pathname !== nextLocation.pathname),
    [isDirty]
  );

  const blocker = useBlocker(shouldBlock);

  // --- Browser unload (tab close / refresh / external navigation) ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      // Standard way to trigger native browser "Leave site?" prompt
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const proceedNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker]);

  const confirmNavigation = useCallback(() => {
    onDiscard?.();
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker, onDiscard]);

  const cancelNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  const saveAndNavigate = useCallback(async () => {
    if (onSave) {
      try {
        setIsSaving(true);
        await onSave();
        proceedNavigation();
      } finally {
        setIsSaving(false);
      }
    } else {
      proceedNavigation();
    }
  }, [onSave, proceedNavigation]);

  return {
    isGuardOpen: Boolean(isDirty && blocker.state === 'blocked'),
    confirmNavigation,
    cancelNavigation,
    proceedNavigation,
    saveAndNavigate,
    isSaving,
  };
}
