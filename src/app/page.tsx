import { signIn } from '@/auth';
import { HomeScreen, HomeEmptyScreen, HomeSyncingScreen, getCachedVehicles, getVehicles, syncVehicles } from '@/features/vehicles';
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
  const [cachedVehicles, settings] = await Promise.all([getCachedVehicles(), getSettings()]);

  // If no cached vehicles, try a full sync — the user may have just linked Tesla
  const vehicles = cachedVehicles.length === 0 ? await getVehicles() : cachedVehicles;

  if (vehicles.length === 0) {
    // Tesla is linked but sync hasn't completed yet (race condition on OAuth redirect).
    // Show a syncing state with polling instead of the empty "Add Your Tesla" screen.
    if (settings?.teslaLinked) {
      return <HomeSyncingScreen fetchVehicles={getCachedVehicles} onLinkTesla={handleLinkTesla} />;
    }
    return <HomeEmptyScreen onLinkTesla={handleLinkTesla} />;
  }

  const showPairingModal = settings ? shouldShowPairingModal(settings) : false;

  return (
    <div className="min-h-screen bg-bg-primary">
      <HomeScreen vehicles={vehicles} drives={MOCK_DRIVES} onSync={syncVehicles} />
      {showPairingModal && (
        <PairingModalTrigger autoShow onDefer={handleDeferPairing} />
      )}
      <BottomNav />
    </div>
  );
}
