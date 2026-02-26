import { HomeScreen } from '@/features/vehicles';
import { MOCK_VEHICLES, MOCK_DRIVES } from '@/lib/mock-data';

/**
 * Home page — full-screen live map with bottom sheet.
 * This is the primary authenticated screen.
 * Fetches vehicle data and passes to HomeScreen feature component.
 */
export default function HomePage() {
  return <HomeScreen vehicles={MOCK_VEHICLES} drives={MOCK_DRIVES} />;
}
