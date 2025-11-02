const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function approveExistingUsers() {
  try {
    console.log('🔄 Approving all existing users...');

    const result = await prisma.user.updateMany({
      where: {
        approved: false,
      },
      data: {
        approved: true,
      },
    });

    console.log(`✅ Approved ${result.count} existing users`);
  } catch (error) {
    console.error('❌ Error approving users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

approveExistingUsers();
