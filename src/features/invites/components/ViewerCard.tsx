import type { Invite } from '@/types/invite';

/** Props for the ViewerCard component. */
export interface ViewerCardProps {
  /** The accepted invite to display. */
  invite: Invite;
  /** Callback to revoke this invite. */
  onRevoke?: (id: string) => void;
}

/**
 * Single active viewer row — avatar with online dot, name, permission, last seen, revoke action.
 */
export function ViewerCard({ invite, onRevoke }: ViewerCardProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Avatar */}
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center">
          <span className="text-text-secondary font-medium text-sm">
            {invite.label.charAt(0).toUpperCase()}
          </span>
        </div>
        {/* Online indicator */}
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-primary ${
            invite.isOnline ? 'bg-status-driving' : 'bg-text-muted'
          }`}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-text-primary text-sm font-medium">{invite.label}</p>
          <span className="text-text-muted text-[10px]">
            {invite.permission === 'live+history' ? 'Full access' : 'Live only'}
          </span>
        </div>
        <p className="text-text-muted text-xs font-light">
          {invite.isOnline ? 'Online now' : `Last seen ${invite.lastSeen}`}
        </p>
      </div>

      {/* Revoke — subtle text button */}
      <button
        className="text-text-muted text-xs hover:text-text-secondary transition-colors"
        aria-label={`Revoke access for ${invite.label}`}
        onClick={() => onRevoke?.(invite.id)}
      >
        Revoke
      </button>
    </div>
  );
}
