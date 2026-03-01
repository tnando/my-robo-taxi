import { Suspense } from 'react';

import { SignInForm } from '@/features/auth';

/**
 * Sign-in page — minimal dark auth screen.
 * Suspense boundary required because SignInForm reads searchParams (callbackUrl).
 */
export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
