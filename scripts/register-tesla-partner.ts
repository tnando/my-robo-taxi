/**
 * Register as a Tesla Fleet API partner.
 *
 * Prerequisites:
 *   1. Deploy to Vercel so the public key is live at:
 *      https://myrobotaxi.app/.well-known/appspecific/com.tesla.3p.public-key.pem
 *   2. Set AUTH_TESLA_ID and AUTH_TESLA_SECRET in .env.local
 *
 * Usage: npm run tesla:register
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const TESLA_TOKEN_URL = 'https://auth.tesla.com/oauth2/v3/token';
const TESLA_PARTNER_URL =
  'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts';
const DOMAIN = 'myrobotaxi.app';

function loadEnv(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env.local');
  const vars: Record<string, string> = {};

  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      vars[key] = value;
    }
  } catch {
    console.error('Could not read .env.local — make sure it exists.');
    process.exit(1);
  }

  return vars;
}

async function getPartnerToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const res = await fetch(TESLA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'openid vehicle_device_data vehicle_cmds vehicle_location',
      audience: 'https://fleet-api.prd.na.vn.cloud.tesla.com',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token request failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function registerPartner(token: string): Promise<void> {
  const res = await fetch(TESLA_PARTNER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ domain: DOMAIN }),
  });

  const body = await res.text();

  if (!res.ok) {
    throw new Error(`Partner registration failed (${res.status}): ${body}`);
  }

  console.log('Partner registration successful!');
  console.log('Response:', body);
}

async function main(): Promise<void> {
  const env = loadEnv();
  const clientId = env['AUTH_TESLA_ID'];
  const clientSecret = env['AUTH_TESLA_SECRET'];

  if (!clientId || !clientSecret) {
    console.error(
      'Missing AUTH_TESLA_ID or AUTH_TESLA_SECRET in .env.local',
    );
    process.exit(1);
  }

  console.log(`Registering partner for domain: ${DOMAIN}`);
  console.log('Getting partner token...');

  const token = await getPartnerToken(clientId, clientSecret);
  console.log('Got partner token. Registering...');

  await registerPartner(token);
}

main().catch((err: unknown) => {
  console.error('Registration failed:', err);
  process.exit(1);
});
