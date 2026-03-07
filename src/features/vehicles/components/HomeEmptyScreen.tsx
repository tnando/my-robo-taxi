import { CarIcon } from './CarIcon';

export interface HomeEmptyScreenProps {
  onLinkTesla: () => void;
}

/**
 * Empty state for the home screen — shown when no vehicles are linked.
 * Gold gradient glow background, car icon, welcome heading, two CTA buttons.
 * Matches ui-mocks/src/pages/HomeEmpty.tsx pixel-for-pixel.
 */
export function HomeEmptyScreen({ onLinkTesla }: HomeEmptyScreenProps) {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-8 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg-primary via-bg-primary to-bg-surface opacity-50" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-gold/[0.03] blur-3xl" />

      <div className="relative z-10 text-center max-w-sm animate-fade-in">
        {/* Car icon — line art in gold */}
        <div className="mb-12">
          <CarIcon />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-semibold text-text-primary tracking-tight mb-4">
          Welcome to MyRoboTaxi
        </h1>

        {/* Subtext */}
        <p className="text-text-secondary text-base font-light leading-relaxed mb-14">
          Get started by adding your Tesla or joining a friend&apos;s car.
        </p>

        {/* Buttons */}
        <div className="space-y-4">
          {/* Primary CTA — gold filled */}
          <form action={onLinkTesla}>
            <button
              type="submit"
              className="w-full bg-gold text-bg-primary font-semibold py-4 px-6 rounded-xl hover:bg-gold-light transition-colors text-base"
            >
              Add Your Tesla
            </button>
          </form>

          {/* Secondary — outlined */}
          <button
            className="w-full border border-border-default text-text-primary font-medium py-4 px-6 rounded-xl hover:bg-bg-surface transition-colors text-base opacity-50 cursor-not-allowed"
            disabled
          >
            Enter Invite Code
          </button>
        </div>
      </div>
    </div>
  );
}
