import React from 'react';
import { AlertTriangle, CalendarPlus, X } from 'lucide-react';

export interface PendingGCalAction {
  type: 'create' | 'delete';
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

interface ConfirmGoogleCalendarActionModalProps {
  action: PendingGCalAction | null;
  busy: boolean;
  onCancel: () => void;
}

export const ConfirmGoogleCalendarActionModal: React.FC<
  ConfirmGoogleCalendarActionModalProps
> = ({ action, busy, onCancel }) => {
  if (!action) return null;

  const isDelete = action.type === 'delete';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gcal-confirm-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-[#242936] bg-white dark:bg-[#13161C] p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                isDelete
                  ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                  : 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
              }`}
            >
              {isDelete ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CalendarPlus className="w-4 h-4" />
              )}
            </div>
            <h3
              id="gcal-confirm-title"
              className="text-base font-semibold text-gray-900 dark:text-white"
            >
              {action.title}
            </h3>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            aria-label="Cancel confirmation"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-[#9CA3AF] leading-relaxed">
          {action.description}
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-[#1E232E]">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-gray-200 dark:border-[#262C3B] px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1B1F2A]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void action.onConfirm();
            }}
            className={`rounded-xl px-4 py-2 text-xs font-medium text-white transition-colors disabled:opacity-60 ${
              isDelete
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-violet-600 hover:bg-violet-500'
            }`}
          >
            {busy ? 'Working...' : action.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
