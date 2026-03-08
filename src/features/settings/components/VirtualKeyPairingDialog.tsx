'use client';

import { useCallback, useEffect, useRef } from 'react';

import { TESLA_KEY_PAIRING_URL } from '@/lib/constants';

/** Props for the VirtualKeyPairingDialog component. */
export interface VirtualKeyPairingDialogProps {
  open: boolean;
  onDefer: () => void;
}

const PREREQUISITES = [
  'Tesla app installed',
  'Bluetooth enabled',
  'Within 30 feet of your car',
];

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
        {/* Gold key icon */}
        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center mb-4">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gold"
            aria-hidden="true"
          >
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        </div>

        <h2
          id="pairing-dialog-title"
          className="text-text-primary text-lg font-semibold mb-2"
        >
          Pair Your Virtual Key
        </h2>
        <p
          id="pairing-dialog-desc"
          className="text-text-secondary text-sm font-light mb-5"
        >
          To see live location, temps, and vehicle details, pair your virtual key
          using the Tesla app. One-time setup.
        </p>

        <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-3">
          You&apos;ll need
        </p>
        <ul className="space-y-2.5 mb-6">
          {PREREQUISITES.map((item) => (
            <li key={item} className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
              <span className="text-text-primary text-sm font-light">{item}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3">
          <a
            href={TESLA_KEY_PAIRING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-3.5 px-6 text-sm font-semibold bg-gold text-bg-primary rounded-xl hover:bg-gold-light transition-colors"
          >
            Open Tesla App to Pair
          </a>
          <button
            ref={deferRef}
            type="button"
            onClick={onDefer}
            className="w-full py-3 px-6 text-sm font-medium text-text-secondary border border-border-default rounded-xl hover:bg-bg-surface-hover transition-colors"
          >
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  );
}
