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
              return {
                id: String(profile.sub ?? profile.id),
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
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
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
