const { createClerkClient } = require('@clerk/backend');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?pgbouncer=true',
    },
  },
});

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

async function main() {
  console.log('🔄 Syncing Clerk users to database...\n');

  try {
    // Deallocate prepared statements
    await prisma.$executeRawUnsafe('DEALLOCATE ALL');

    // Get all users from Clerk
    const clerkUsers = await clerkClient.users.getUserList();

    console.log(`Found ${clerkUsers.totalCount} users in Clerk\n`);

    let created = 0;
    let existing = 0;
    let errors = 0;

    for (const clerkUser of clerkUsers.data) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { id: clerkUser.id },
        });

        if (existingUser) {
          console.log(`✓ User ${clerkUser.id} already exists`);
          existing++;
        } else {
          // Create user in database
          await prisma.user.create({
            data: {
              id: clerkUser.id,
              role: 'STUDENT',
              onboardingComplete: false,
            },
          });
          console.log(`✅ Created user ${clerkUser.id}`);
          created++;
        }
      } catch (error) {
        console.error(`❌ Error processing user ${clerkUser.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Already existed: ${existing}`);
    console.log(`   Errors: ${errors}`);
    console.log(`\n✅ Sync complete!`);
  } catch (error) {
    console.error('❌ Error syncing users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
