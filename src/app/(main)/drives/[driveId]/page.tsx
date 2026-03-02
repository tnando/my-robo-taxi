import { DriveSummaryScreen } from '@/features/drives';
import { MOCK_DRIVES } from '@/lib/mock-data';

/** Props passed by Next.js for dynamic route segments. */
interface DriveSummaryPageProps {
  params: Promise<{ driveId: string }>;
}

/**
 * Drive summary page — detailed view of a single drive.
 * Fetches drive by ID and passes to DriveSummaryScreen.
 */
export default async function DriveSummaryPage({ params }: DriveSummaryPageProps) {
  const { driveId } = await params;
  const drive = MOCK_DRIVES.find((d) => d.id === driveId) ?? MOCK_DRIVES[0];

  return <DriveSummaryScreen drive={drive} />;
}
