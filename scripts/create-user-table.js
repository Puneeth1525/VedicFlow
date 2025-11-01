const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?pgbouncer=true',
    },
  },
});

async function main() {
  console.log('Creating User table and UserRole enum...');

  try {
    // Deallocate all prepared statements first
    await prisma.$executeRawUnsafe('DEALLOCATE ALL');

    // Create enum type
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'MENTOR', 'TEACHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('✓ UserRole enum created');

    // Create User table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
        "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
        "baseToneHz" DOUBLE PRECISION,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);

    console.log('✓ User table created');

    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "User_onboardingComplete_idx" ON "User"("onboardingComplete");
    `);

    console.log('✓ Indexes created');
    console.log('\n✅ Database schema updated successfully!');
  } catch (error) {
    console.error('Error creating schema:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
