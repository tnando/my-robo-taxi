'use client';

import { useState, useTransition } from 'react';

import { VirtualKeyPairingDialog } from './VirtualKeyPairingDialog';

/** Props for the PairingModalTrigger component. */
export interface PairingModalTriggerProps {
  /** Whether the modal should auto-show on mount. */
  autoShow: boolean;
  /** Server action to persist the deferral. */
  onDefer: () => Promise<void>;
}

/**
 * Client wrapper that manages open/close state for the VirtualKeyPairingDialog.
 * Rendered by app/ pages to bridge server-computed `shouldShow` with client interactivity.
 */
export function PairingModalTrigger({ autoShow, onDefer }: PairingModalTriggerProps) {
  const [open, setOpen] = useState(autoShow);
  const [, startTransition] = useTransition();

  const handleDefer = () => {
    setOpen(false);
    startTransition(async () => {
      await onDefer();
    });
  };

  return <VirtualKeyPairingDialog open={open} onDefer={handleDefer} />;
}
