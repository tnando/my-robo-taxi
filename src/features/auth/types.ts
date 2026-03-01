/**
 * Feature-specific types for the auth domain.
 */

/** Auth provider types for social login (Google + Apple only). */
export type AuthProvider = 'google' | 'apple';

/** Authenticated user profile from the session. */
export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

/** Session loading state from NextAuth. */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
