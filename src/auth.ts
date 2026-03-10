import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import { PrismaAdapter } from '@auth/prisma-adapter';

import { prisma } from '@/lib/prisma';
import {
  TESLA_AUTH_URL,
  TESLA_TOKEN_URL,
  TESLA_USERINFO_URL,
  TESLA_AUDIENCE,
  TESLA_ISSUER,
  TESLA_SCOPES,
} from '@/lib/tesla';

/**
 * Reassign a Tesla account (and its vehicles) from an orphan user to the real
 * authenticated user. Called from the JWT callback when Tesla OAuth creates a
 * separate user because the Tesla profile returned an empty email.
 */
async function reassignTeslaToCurrentUser(
  orphanUserId: string,
  realUserId: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.account.updateMany({
      where: { userId: orphanUserId, provider: 'tesla' },
      data: { userId: realUserId },
    }),
    prisma.vehicle.updateMany({
      where: { userId: orphanUserId },
      data: { userId: realUserId },
    }),
    prisma.settings.upsert({
      where: { userId: realUserId },
      create: { userId: realUserId, teslaLinked: true },
      update: { teslaLinked: true },
    }),
  ]);

  // Delete the orphan user — cascade cleans up its Settings row
  await prisma.user.delete({ where: { id: orphanUserId } }).catch(() => {
    // Ignore if already deleted or has remaining dependencies
  });

  // Sync vehicles for the real user — the linkAccount event ran the sync
  // for the orphan before reassignment, so the real user has no vehicles yet.
  try {
    const { syncVehiclesFromTesla } = await import(
      '@/features/vehicles/api/sync'
    );
    await syncVehiclesFromTesla(realUserId);
  } catch {
    // Non-blocking — vehicles will sync on next page load
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Google({ allowDangerousEmailAccountLinking: true }),
    ...(process.env.AUTH_APPLE_ID
      ? [Apple({ allowDangerousEmailAccountLinking: true })]
      : []),
    ...(process.env.AUTH_TESLA_ID
      ? [
          {
            id: 'tesla',
            name: 'Tesla',
            type: 'oauth' as const,
            issuer: TESLA_ISSUER,
            clientId: process.env.AUTH_TESLA_ID,
            clientSecret: process.env.AUTH_TESLA_SECRET,
            authorization: {
              url: TESLA_AUTH_URL,
              params: { scope: TESLA_SCOPES },
            },
            token: {
              url: TESLA_TOKEN_URL,
              params: { audience: TESLA_AUDIENCE },
            },
            client: {
              token_endpoint_auth_method: 'client_secret_post' as const,
            },
            userinfo: { url: TESLA_USERINFO_URL },
            profile(profile: Record<string, unknown>) {
              const sub = profile.sub ?? profile.id;
              if (!sub) {
                throw new Error(
                  'Tesla userinfo response missing user identifier (sub/id)',
                );
              }
              return {
                id: String(sub),
                name: String(profile.full_name ?? profile.name ?? 'Tesla User'),
                email: String(profile.email ?? ''),
              };
            },
            allowDangerousEmailAccountLinking: true,
          },
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id) {
        if (
          account?.provider === 'tesla' &&
          token.id &&
          token.id !== user.id &&
          !user.email
        ) {
          // Tesla OAuth created an orphan user (empty email couldn't match the
          // existing Google user). Reassign the Tesla account and vehicles to
          // the real user whose session initiated the link.
          await reassignTeslaToCurrentUser(user.id, String(token.id));
          // Keep token.id pointing to the real (Google) user
        } else {
          token.id = user.id;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  events: {
    async linkAccount({ account }) {
      if (account.provider === 'tesla' && account.userId) {
        const userId = account.userId;
        await prisma.settings.upsert({
          where: { userId },
          create: { userId, teslaLinked: true },
          update: { teslaLinked: true },
        });

        // Trigger initial vehicle sync (failure does not block OAuth redirect)
        try {
          const { syncVehiclesFromTesla } = await import(
            '@/features/vehicles/api/sync'
          );
          await syncVehiclesFromTesla(userId);
        } catch (err) {
          console.error('Initial vehicle sync after Tesla link failed:', err);
        }
      }
    },
  },
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
});
