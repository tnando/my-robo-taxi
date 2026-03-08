import { signIn } from '@/auth';
import { HomeScreen, HomeEmptyScreen, getCachedVehicles, syncVehicles } from '@/features/vehicles';
import { getSettings, deferKeyPairing, shouldShowPairingModal, PairingModalTrigger } from '@/features/settings';
import { MOCK_DRIVES } from '@/lib/mock-data';
import { BottomNav } from '@/components/layout/BottomNav';

/** Server action to initiate Tesla OAuth account linking. */
async function handleLinkTesla() {
  'use server';
  await signIn('tesla', { redirectTo: '/' });
}

/** Server action to defer virtual key pairing. */
async function handleDeferPairing() {
  'use server';
  await deferKeyPairing();
}

/**
 * Root route — renders the Home screen with map.
 * Auth gate will redirect unauthenticated users to /signin once NextAuth is integrated.
 */
export default async function RootPage() {
  const [vehicles, settings] = await Promise.all([getCachedVehicles(), getSettings()]);

  if (vehicles.length === 0) {
    return <HomeEmptyScreen onLinkTesla={handleLinkTesla} />;
  }

  const virtualKeyPaired = settings?.virtualKeyPaired ?? false;
  const showPairingModal = settings ? shouldShowPairingModal(settings) : false;

  return (
    <div className="min-h-screen bg-bg-primary">
      <HomeScreen vehicles={vehicles} drives={MOCK_DRIVES} virtualKeyPaired={virtualKeyPaired} onSync={syncVehicles} />
      {showPairingModal && (
        <PairingModalTrigger autoShow onDefer={handleDeferPairing} />
      )}
      <BottomNav />
    </div>
  );
}
