import React from 'react';
import { CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import type { SaveStatus } from '../../hooks/useAutosave';

interface SaveStatusBadgeProps {
  status: SaveStatus;
}

/**
 * A compact, non-intrusive indicator that shows the current autosave state.
 * Renders nothing when status is 'idle'.
 *
 * Usage:
 *   <SaveStatusBadge status={autoSaveStatus} />
 */
export const SaveStatusBadge: React.FC<SaveStatusBadgeProps> = ({ status }) => {
  if (status === 'idle') return null;

  const configs: Record<Exclude<SaveStatus, 'idle'>, {
    icon: React.ReactNode;
    label: string;
    className: string;
  }> = {
    unsaved: {
      icon: <Clock className="w-3 h-3" />,
      label: 'Unsaved changes',
      className: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    saving: {
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      label: 'Saving…',
      className: 'text-sky-600 bg-sky-50 border-sky-200',
    },
    saved: {
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: 'All changes saved',
      className: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    error: {
      icon: <AlertCircle className="w-3 h-3" />,
      label: "Couldn't autosave",
      className: 'text-rose-600 bg-rose-50 border-rose-200',
    },
  };

  const { icon, label, className } = configs[status as Exclude<SaveStatus, 'idle'>];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-all duration-300 ${className}`}
    >
      {icon}
      {label}
    </span>
  );
};
