import { encode } from '@auth/core/jwt';

const TEST_USER = {
  id: 'dev-user-001',
  name: 'Thomas Nandola',
  email: 'thomas@myrobotaxi.dev',
  image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=thomas',
};

/**
 * Cookie name NextAuth uses in development (non-HTTPS).
 * Secure prefix (__Secure-) is only used on HTTPS origins.
 */
const COOKIE_NAME = 'authjs.session-token';

/**
 * Generates a valid NextAuth JWT token for the seeded test user.
 * Uses the same encode function NextAuth uses internally.
 */
export async function generateSessionToken(): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET env var is required for E2E auth');
  }

  const token = await encode({
    token: {
      sub: TEST_USER.id,
      id: TEST_USER.id,
      name: TEST_USER.name,
      email: TEST_USER.email,
      picture: TEST_USER.image,
    },
    secret,
    salt: COOKIE_NAME,
    maxAge: 30 * 24 * 60 * 60,
  });

  return token;
}

/**
 * Builds a Playwright-compatible storageState object with the
 * NextAuth session cookie set for localhost:3000.
 */
export async function createAuthStorageState(): Promise<{
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Lax' | 'Strict' | 'None';
  }>;
  origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
}> {
  const token = await generateSessionToken();

  return {
    cookies: [
      {
        name: COOKIE_NAME,
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
      {
        name: 'beta-access',
        value: 'granted',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  };
}
