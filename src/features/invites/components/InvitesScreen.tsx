'use client';

import { useState } from 'react';

import type { Invite } from '@/types/invite';

import { ViewerCard } from './ViewerCard';
import { PendingInviteCard } from './PendingInviteCard';

/** Props for the InvitesScreen component. */
export interface InvitesScreenProps {
  /** All invites (active + pending). */
  invites: Invite[];
  /** Callback to revoke an invite by ID. */
  onRevoke?: (id: string) => void;
  /** Callback to resend an invite by ID. */
  onResend?: (id: string) => void;
}

/**
 * Invite management screen — email input, active viewer list, pending invite list.
 * Matches ui-mocks/src/pages/Invites.tsx pixel-for-pixel.
 */
export function InvitesScreen({ invites, onRevoke, onResend }: InvitesScreenProps) {
  const [emailInput, setEmailInput] = useState('');

  const activeViewers = invites.filter((i) => i.status === 'accepted');
  const pendingInvites = invites.filter((i) => i.status === 'pending');

  return (
    <div className="min-h-screen bg-bg-primary pb-28">
      {/* Header */}
      <header className="px-6 pt-16 pb-10">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
          Share Your Tesla
        </h1>
      </header>

      {/* Invite input */}
      <div className="px-6 mb-12">
        <div className="flex gap-3">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Email address"
            className="flex-1 bg-bg-surface border border-border-default rounded-xl py-4 px-5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/30 transition-colors"
          />
          <button className="bg-gold text-bg-primary font-semibold px-6 rounded-xl hover:bg-gold-light transition-colors text-sm whitespace-nowrap">
            Send Invite
          </button>
        </div>
      </div>

      {/* Active Viewers */}
      <div className="px-6 mb-10">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-5">
          Viewers · {activeViewers.length}
        </p>

        {activeViewers.length === 0 ? (
          <p className="text-text-muted text-sm font-light">No viewers yet</p>
        ) : (
          <div className="space-y-4">
            {activeViewers.map((invite) => (
              <ViewerCard key={invite.id} invite={invite} onRevoke={onRevoke} />
            ))}
          </div>
        )}
      </div>

      {/* Pending */}
      {pendingInvites.length > 0 && (
        <div className="px-6">
          <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-5">
            Pending · {pendingInvites.length}
          </p>

          <div className="space-y-4">
            {pendingInvites.map((invite) => (
              <PendingInviteCard
                key={invite.id}
                invite={invite}
                onResend={onResend}
                onCancel={onRevoke}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
