import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create mantras
  const mantras = [
    {
      id: 'ganesha-gayatri',
      title: 'Ganesha Gayatri Mantra',
      category: 'Ganapati Upanishad',
      difficulty: 'Beginner',
      verses: 3,
      duration: '1 min',
      audioUrl: null,
    },
    {
      id: 'ganapathi-atharva-shirsham',
      title: 'Ganapathi Atharva Shirsham',
      category: 'Atharvaveda',
      difficulty: 'Intermediate',
      verses: 10,
      duration: '5 min',
      audioUrl: null,
    },
  ];

  for (const mantra of mantras) {
    await prisma.mantra.upsert({
      where: { id: mantra.id },
      update: mantra,
      create: mantra,
    });
    console.log(`✓ Created/Updated mantra: ${mantra.title}`);
  }

  console.log('✓ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
