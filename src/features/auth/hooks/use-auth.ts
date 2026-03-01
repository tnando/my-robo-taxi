'use client';

import { useSession, signOut as nextAuthSignOut } from 'next-auth/react';

import type { AuthUser, AuthStatus } from '../types';

interface UseAuthReturn {
  user: AuthUser | null;
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => void;
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();

  const signOut = () => {
    nextAuthSignOut({ callbackUrl: '/signin' });
  };

  return {
    user: session?.user
      ? {
          id: session.user.id,
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          image: session.user.image ?? null,
        }
      : null,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    signOut,
  };
}
