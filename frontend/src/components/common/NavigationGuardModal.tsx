import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowRight, Save, Trash2, X } from 'lucide-react';

interface NavigationGuardModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Called when user confirms navigation — discard changes & clear localStorage */
  onDiscard: () => void;
  /** Called when user chooses to save then navigate */
  onSave?: () => void;
  /** Called when user chooses to stay on the page */
  onStay: () => void;
  /** Shown when saving is in progress */
  isSaving?: boolean;
  /** Override save button label (default: "Save & Leave") */
  saveLabel?: string;
  /** Override discard button label (default: "Discard Changes & Leave") */
  discardLabel?: string;
  /** Override the title text */
  title?: string;
  /** Override the description text */
  description?: string;
}

/**
 * Navigation guard dialog.
 * Shown when the user tries to navigate away with unsaved changes.
 */
export const NavigationGuardModal: React.FC<NavigationGuardModalProps> = ({
  isOpen,
  onDiscard,
  onSave,
  onStay,
  isSaving = false,
  saveLabel = 'Save & Leave',
  discardLabel = 'Discard Changes & Leave',
  title = 'You have unsaved changes',
  description,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {description ??
                'If you leave now without saving, your changes will be discarded. What would you like to do?'}
            </p>
          </div>
          <button
            onClick={onStay}
            className="shrink-0 text-slate-400 hover:text-slate-600 transition -mt-0.5"
            title="Stay on page"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {/* Save & Leave — shown whenever onSave handler is provided */}
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </>
              )}
            </button>
          )}

          {/* Discard & Leave */}
          <button
            onClick={onDiscard}
            disabled={isSaving}
            className="w-full py-2.5 px-4 border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{discardLabel}</span>
          </button>

          {/* Stay */}
          <button
            onClick={onStay}
            disabled={isSaving}
            className="w-full py-2 px-4 text-slate-600 hover:bg-slate-100 font-medium text-xs rounded-xl transition"
          >
            Stay on Page
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
