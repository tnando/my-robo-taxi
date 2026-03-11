/**
 * Tesla Fleet API constants and token management utilities.
 * Used for OAuth account linking and API access.
 */

import { prisma } from '@/lib/prisma';

// ─── Tesla OAuth / Fleet API constants ──────────────────────────────────────

export const TESLA_AUTH_URL = 'https://auth.tesla.com/oauth2/v3/authorize';
export const TESLA_TOKEN_URL =
  'https://auth.tesla.com/oauth2/v3/token';
export const TESLA_USERINFO_URL =
  'https://auth.tesla.com/oauth2/v3/userinfo';
export const TESLA_AUDIENCE = 'https://fleet-api.prd.na.vn.cloud.tesla.com';
export const TESLA_ISSUER = 'https://auth.tesla.com/oauth2/v3/nts';
export const TESLA_SCOPES =
  'openid email offline_access user_data vehicle_device_data vehicle_cmds vehicle_location';

// ─── Token refresh ──────────────────────────────────────────────────────────

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Exchange a single-use refresh token for a new token set.
 * Throws on network or auth errors.
 */
export async function refreshTeslaToken(
  refreshToken: string,
): Promise<TokenResponse> {
  const clientId = process.env.AUTH_TESLA_ID;
  const clientSecret = process.env.AUTH_TESLA_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Tesla OAuth credentials not configured');
  }

  const res = await fetch(TESLA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tesla token refresh failed: ${res.status}`);
  }

  return res.json() as Promise<TokenResponse>;
}

/**
 * Get a valid Tesla access token for the given user.
 * Returns the current token if still valid, or refreshes it automatically.
 * Returns null if no Tesla account is linked.
 */
export async function getTeslaAccessToken(
  userId: string,
): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'tesla' },
  });

  if (!account?.access_token || !account.refresh_token) {
    return null;
  }

  // Check if token is still valid (with 5-minute buffer)
  const now = Math.floor(Date.now() / 1000);
  if (account.expires_at && account.expires_at > now + 300) {
    return account.access_token;
  }

  // Token expired — refresh it
  const tokens = await refreshTeslaToken(account.refresh_token);

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: now + tokens.expires_in,
    },
  });

  return tokens.access_token;
}
