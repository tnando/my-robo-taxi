import {
  InvitesScreen,
  getInvites,
  revokeInvite,
  resendInvite,
} from '@/features/invites';

/**
 * Invites page — invite management screen.
 * Fetches invite data and passes to InvitesScreen.
 */
export default async function InvitesPage() {
  const invites = await getInvites();

  return (
    <InvitesScreen
      invites={invites}
      onRevoke={revokeInvite}
      onResend={resendInvite}
    />
  );
}
