import type { Invite } from '@/types/invite';

/** Props for the PendingInviteCard component. */
export interface PendingInviteCardProps {
  /** The pending invite to display. */
  invite: Invite;
  /** Callback to resend this invite. */
  onResend?: (id: string) => void;
  /** Callback to cancel (revoke) this invite. */
  onCancel?: (id: string) => void;
}

/**
 * Single pending invite row — avatar initial, name, email, resend/cancel actions.
 */
export function PendingInviteCard({ invite, onResend, onCancel }: PendingInviteCardProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center">
        <span className="text-text-muted font-medium text-sm">
          {invite.label.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-text-secondary text-sm font-medium">{invite.label}</p>
        <p className="text-text-muted text-xs font-light">{invite.email}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          className="text-text-muted text-xs hover:text-text-secondary transition-colors"
          aria-label={`Resend invite to ${invite.label}`}
          onClick={() => onResend?.(invite.id)}
        >
          Resend
        </button>
        <button
          className="text-text-muted text-xs hover:text-text-secondary transition-colors"
          aria-label={`Cancel invite for ${invite.label}`}
          onClick={() => onCancel?.(invite.id)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
