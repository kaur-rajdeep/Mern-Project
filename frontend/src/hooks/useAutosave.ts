import { useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

interface UseAutosaveOptions<T> {
  /** Milliseconds to wait after the last change before saving. Default: 1500 */
  debounceMs?: number;
  /**
   * Optional guard — return `false` to suppress the autosave (e.g. when form has errors).
   * The status will still be set to 'unsaved' so the user knows there are pending changes.
   */
  validate?: (data: T) => boolean;
}

/**
 * Debounced autosave hook.
 *
 * Watches `data` for changes (skipping the initial mount), then after `debounceMs`
 * milliseconds of inactivity calls `saveFn`. Returns a `SaveStatus` that can be
 * used to drive a status indicator in the UI.
 *
 * Usage:
 *   const status = useAutosave(profileData, async (d) => { await api.put(..., d); });
 */
export function useAutosave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  options: UseAutosaveOptions<T> = {}
): SaveStatus {
  const { debounceMs = 1500, validate } = options;

  const [status, setStatus] = useState<SaveStatus>('idle');

  // Track the baseline data so we never trigger unsaved when data is unchanged
  const lastSavedData = useRef<string>(JSON.stringify(data));
  const isInitialMount = useRef(true);
  const latestData = useRef(data);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestData.current = data;

    // Skip autosave on the very first render and set baseline
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastSavedData.current = JSON.stringify(data);
      return;
    }

    // If the data has not changed compared to last saved state, do nothing
    const currentSerialized = JSON.stringify(data);
    if (currentSerialized === lastSavedData.current) {
      return;
    }

    // Clear any pending debounce / reset timers
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (resetTimer.current) clearTimeout(resetTimer.current);

    // If the data doesn't pass validation, mark unsaved but don't schedule a save
    if (validate && !validate(data)) {
      setStatus('unsaved');
      return;
    }

    setStatus('unsaved');

    // Schedule the actual save
    debounceTimer.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await saveFn(latestData.current);
        lastSavedData.current = JSON.stringify(latestData.current);
        setStatus('saved');
        // After 3 seconds, quietly go back to idle
        resetTimer.current = setTimeout(() => setStatus('idle'), 3000);
      } catch {
        setStatus('error');
        // Allow user to retry by reverting to 'unsaved' after a moment
        resetTimer.current = setTimeout(() => setStatus('unsaved'), 4000);
      }
    }, debounceMs);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return status;
}
