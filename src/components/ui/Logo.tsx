/** Props for the Logo component. */
export interface LogoProps {
  /** Size variant: 'lg' for sign-in, 'sm' for sign-up. Defaults to 'lg'. */
  size?: 'lg' | 'sm';
  /** Whether to show the branded wordmark text. Defaults to true. */
  showWordmark?: boolean;
}

/**
 * MyRoboTaxi hexagonal logo with optional branded wordmark.
 * Gold hexagon outline with center dot, matching the sign-in/sign-up mock.
 */
export function Logo({ size = 'lg', showWordmark = true }: LogoProps) {
  const iconSize = size === 'lg' ? 48 : 40;
  const containerClass = size === 'lg' ? 'w-16 h-16 mb-8' : 'w-14 h-14 mb-6';

  return (
    <div className="text-center">
      <div className={`${containerClass} mx-auto flex items-center justify-center`}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
          <path
            d="M24 4L6 16v16l18 12 18-12V16L24 4z"
            stroke="#C9A84C"
            strokeWidth="1.5"
            fill="none"
          />
          <circle cx="24" cy="24" r="3" fill="#C9A84C" />
        </svg>
      </div>
      {showWordmark && (
        <h1 className={`font-semibold text-text-primary tracking-tight ${
          size === 'lg' ? 'text-3xl mb-3' : 'text-2xl mb-2'
        }`}>
          My<span className="text-gold">Robo</span>Taxi
        </h1>
      )}
    </div>
  );
}
