/**
 * One-time migration: reassign Tesla accounts and vehicles from orphaned
 * "Tesla User" records to the real Google-authenticated users.
 *
 * Background: Tesla's OIDC userinfo returns no email, so NextAuth created
 * separate users instead of linking to the existing Google user. See #70.
 *
 * Usage:
 *   DATABASE_URL="postgres://..." npx tsx scripts/migrate-orphaned-tesla-users.ts
 *
 * Or pull Vercel env first:
 *   npx vercel env pull .env.vercel-prod --environment production
 *   source .env.vercel-prod && npx tsx scripts/migrate-orphaned-tesla-users.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find orphan users: have a Tesla Account but empty/null email
  const orphans = await prisma.user.findMany({
    where: {
      OR: [{ email: '' }, { email: null }],
      accounts: { some: { provider: 'tesla' } },
    },
    include: {
      accounts: { where: { provider: 'tesla' } },
      vehicles: true,
    },
  });

  if (orphans.length === 0) {
    console.log('No orphaned Tesla users found. Nothing to migrate.');
    return;
  }

  console.log(`Found ${orphans.length} orphaned Tesla user(s):\n`);

  for (const orphan of orphans) {
    console.log(`  Orphan: ${orphan.id} ("${orphan.name}")`);
    console.log(`    Tesla accounts: ${orphan.accounts.length}`);
    console.log(`    Vehicles: ${orphan.vehicles.length}`);

    // Find the real user: a Google/Apple-authenticated user who does NOT
    // already have a Tesla account linked. Pick the one closest in creation
    // time to the orphan (could be created before or after).
    const candidates = await prisma.user.findMany({
      where: {
        id: { not: orphan.id },
        NOT: [{ email: '' }, { email: null }],
        accounts: {
          some: { provider: { in: ['google', 'apple'] } },
          none: { provider: 'tesla' },
        },
      },
      include: { accounts: { where: { provider: 'tesla' } } },
    });

    // Pick the candidate closest in creation time to the orphan
    const realUser = candidates
      .sort(
        (a, b) =>
          Math.abs(a.createdAt.getTime() - orphan.createdAt.getTime()) -
          Math.abs(b.createdAt.getTime() - orphan.createdAt.getTime()),
      )
      .at(0) ?? null;

    if (!realUser) {
      console.log('    ⚠ No matching Google user found — skipping');
      continue;
    }

    if (realUser.accounts.length > 0) {
      console.log(
        `    ⚠ Real user ${realUser.id} already has a Tesla account — skipping`,
      );
      continue;
    }

    console.log(`    → Reassigning to: ${realUser.id} (${realUser.email})\n`);

    await prisma.$transaction([
      prisma.account.updateMany({
        where: { userId: orphan.id, provider: 'tesla' },
        data: { userId: realUser.id },
      }),
      prisma.vehicle.updateMany({
        where: { userId: orphan.id },
        data: { userId: realUser.id },
      }),
      prisma.settings.upsert({
        where: { userId: realUser.id },
        create: { userId: realUser.id, teslaLinked: true },
        update: { teslaLinked: true },
      }),
    ]);

    // Delete orphan (cascade cleans up their Settings)
    await prisma.user.delete({ where: { id: orphan.id } });
    console.log(`    ✓ Migrated and deleted orphan ${orphan.id}`);
  }

  console.log('\nMigration complete.');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
