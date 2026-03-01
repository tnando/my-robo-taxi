'use client';

import { useRouter } from 'next/navigation';

import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { GoogleIcon, AppleIcon } from '@/components/ui/SocialIcons';

/**
 * Sign-in form with social auth buttons (Google + Apple only).
 * Matches the SignIn.tsx mock: centered layout, outline auth buttons, gold accent.
 */
export function SignInForm() {
  const router = useRouter();

  const handleAuth = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo + tagline */}
        <div className="mb-16">
          <Logo size="lg" />
          <p className="text-text-secondary text-base font-light text-center">Sign in to continue</p>
        </div>

        {/* Auth buttons — outline style on dark bg */}
        <div className="space-y-3 mb-16">
          <Button variant="social" icon={<GoogleIcon />} onClick={handleAuth}>
            Continue with Google
          </Button>
          <Button variant="social" icon={<AppleIcon />} onClick={handleAuth}>
            Continue with Apple
          </Button>
        </div>
      </div>
    </div>
  );
}
