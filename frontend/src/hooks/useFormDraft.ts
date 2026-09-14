/**
 * useFormDraft — localStorage-based form draft persistence.
 *
 * Designed for **creation modals** where the record doesn't exist yet in the DB,
 * so we can't autosave to the server. Instead we persist the draft in localStorage
 * so the user doesn't lose their work if they accidentally close the modal.
 *
 * Usage:
 *   const { getDraft, saveDraft, clearDraft, hasDraft } = useFormDraft<FormShape>('createCustomer');
 *
 *   // When modal opens: check for draft and restore
 *   useEffect(() => {
 *     if (createModalOpen && hasDraft()) {
 *       setFormData(getDraft()!);
 *       toast.info('Draft restored from your last session.');
 *     }
 *   }, [createModalOpen]);
 *
 *   // Persist on every change
 *   useEffect(() => { saveDraft(formData); }, [formData]);
 *
 *   // Clear on submit or cancel
 *   clearDraft();
 */
export function useFormDraft<T>(draftKey: string) {
  const storageKey = `panacea_draft_${draftKey}`;

  /** Returns the stored draft, or `null` if none exists. */
  const getDraft = (): T | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };

  /** Persists the current form value to localStorage. */
  const saveDraft = (value: T): void => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Storage quota exceeded or private browsing — fail silently
    }
  };

  /** Removes the draft from localStorage. Call on submit success or cancel. */
  const clearDraft = (): void => {
    localStorage.removeItem(storageKey);
  };

  /** Returns `true` if a non-empty draft exists. */
  const hasDraft = (): boolean => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      // Make sure the draft is not just an empty object / default value
      const parsed = JSON.parse(raw) as T;
      if (typeof parsed !== 'object' || parsed === null) return false;
      return Object.values(parsed as Record<string, unknown>).some(
        (v) => typeof v === 'string' ? v.trim() !== '' : v !== 0 && v !== null && v !== undefined
      );
    } catch {
      return false;
    }
  };

  return { getDraft, saveDraft, clearDraft, hasDraft };
}
