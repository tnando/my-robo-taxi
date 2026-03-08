'use client';

import { useCallback, useEffect, useRef } from 'react';

import { TESLA_KEY_PAIRING_URL } from '@/lib/constants';

/** Props for the VirtualKeyPairingDialog component. */
export interface VirtualKeyPairingDialogProps {
  open: boolean;
  onDefer: () => void;
}

/**
 * Modal prompting the user to pair their Tesla virtual key.
 * Follows the same patterns as UnlinkConfirmDialog (focus, escape, scroll lock, ARIA).
 */
export function VirtualKeyPairingDialog({
  open,
  onDefer,
}: VirtualKeyPairingDialogProps) {
  const deferRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the safe button when opened
  useEffect(() => {
    if (open) {
      deferRef.current?.focus();
    }
  }, [open]);

  // Escape key dismisses
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDefer();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onDefer]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  // Backdrop click dismisses
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onDefer();
      }
    },
    [onDefer],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-overlay-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pairing-dialog-title"
        aria-describedby="pairing-dialog-desc"
        className="bg-bg-surface border border-border-default rounded-2xl p-6 w-full max-w-xs mx-4 shadow-2xl animate-fade-in"
      >
        <h2
          id="pairing-dialog-title"
          className="text-text-primary text-lg font-semibold mb-2"
        >
          Pair Your Virtual Key
        </h2>
        <p
          id="pairing-dialog-desc"
          className="text-text-secondary text-sm font-light mb-4"
        >
          To see live location, temps, and vehicle details, pair your virtual key
          using the Tesla app. One-time setup.
        </p>
        <p className="text-text-secondary text-sm font-light mb-6">
          You&apos;ll need:
        </p>
        <ul className="text-text-secondary text-sm font-light mb-6 space-y-1 list-disc list-inside">
          <li>Tesla app installed</li>
          <li>Bluetooth enabled</li>
          <li>Within 30 feet of your car</li>
        </ul>

        <div className="flex flex-col gap-3">
          <a
            href={TESLA_KEY_PAIRING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-4 py-2.5 text-sm font-medium bg-accent-gold text-bg-primary rounded-xl hover:bg-accent-gold/90 transition-colors"
          >
            Open Tesla App to Pair
          </a>
          <button
            ref={deferRef}
            type="button"
            onClick={onDefer}
            className="w-full px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text-secondary transition-colors rounded-xl"
          >
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  );
}
