'use client';

import { useEffect, useRef } from 'react';

export interface UnlinkConfirmDialogProps {
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UnlinkConfirmDialog({
  open,
  loading,
  onConfirm,
  onCancel,
}: UnlinkConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="bg-bg-elevated rounded-2xl p-6 max-w-xs w-full backdrop:bg-black/60"
    >
      <h2 className="text-text-primary text-base font-semibold mb-2">
        Unlink Tesla account?
      </h2>
      <p className="text-text-muted text-sm font-light mb-6">
        Your vehicle data will be removed. You can re-link anytime.
      </p>
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-secondary transition-colors rounded-lg disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 transition-colors rounded-lg disabled:opacity-50"
        >
          {loading ? 'Unlinking\u2026' : 'Unlink'}
        </button>
      </div>
    </dialog>
  );
}
