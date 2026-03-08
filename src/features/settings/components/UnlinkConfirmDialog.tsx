'use client';

import { useCallback, useEffect, useRef } from 'react';

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
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the Cancel button when the dialog opens
  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  // Escape key closes dialog (unless loading)
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onCancel]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  // Backdrop click closes dialog (unless loading)
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !loading) {
        onCancel();
      }
    },
    [loading, onCancel],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-overlay-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unlink-dialog-title"
        aria-describedby="unlink-dialog-desc"
        className="bg-bg-surface border border-border-default rounded-2xl p-6 w-full max-w-xs mx-4 shadow-2xl animate-fade-in"
      >
        <h2
          id="unlink-dialog-title"
          className="text-text-primary text-base font-semibold mb-2"
        >
          Unlink Tesla account?
        </h2>
        <p
          id="unlink-dialog-desc"
          className="text-text-secondary text-sm font-light mb-6"
        >
          Your vehicle data will be removed. You can re-link anytime.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text-secondary transition-colors rounded-xl disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 hover:text-red-300 transition-colors rounded-xl disabled:opacity-50"
          >
            {loading ? 'Unlinking\u2026' : 'Unlink'}
          </button>
        </div>
      </div>
    </div>
  );
}
