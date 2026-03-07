import { signIn } from '@/auth';
import { HomeEmptyScreen } from '@/features/vehicles';

/** Server action to initiate Tesla OAuth account linking. */
async function handleLinkTesla() {
  'use server';
  await signIn('tesla', { redirectTo: '/' });
}

/**
 * Empty state page — shown when no vehicles are linked.
 * Premium onboarding screen with CTA buttons.
 */
export default function HomeEmptyPage() {
  return <HomeEmptyScreen onLinkTesla={handleLinkTesla} />;
}
