import { HomeScreen, getVehicles } from '@/features/vehicles';
import { MOCK_DRIVES } from '@/lib/mock-data';
import { BottomNav } from '@/components/layout/BottomNav';

/**
 * Root route — renders the Home screen with map.
 * Auth gate will redirect unauthenticated users to /signin once NextAuth is integrated.
 */
export default async function RootPage() {
  const vehicles = await getVehicles();

  return (
    <div className="min-h-screen bg-bg-primary">
      <HomeScreen vehicles={vehicles} drives={MOCK_DRIVES} />
      <BottomNav />
    </div>
  );
}
