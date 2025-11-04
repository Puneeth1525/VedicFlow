const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding mantras...');

  const mantrasDir = path.join(__dirname, '../data/mantras');
  const mantraFiles = fs.readdirSync(mantrasDir).filter(f => f.endsWith('.json'));

  for (const file of mantraFiles) {
    const filePath = path.join(mantrasDir, file);
    const mantraData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Calculate approximate duration from audio or set default
    const duration = '5 min'; // Default duration
    const verses = mantraData.paragraphs?.length || 1;

    // Determine difficulty based on mantra length and complexity
    let difficulty = 'Beginner';
    if (verses > 3) {
      difficulty = 'Advanced';
    } else if (verses > 1) {
      difficulty = 'Intermediate';
    }

    // Upsert mantra
    const mantra = await prisma.mantra.upsert({
      where: { id: mantraData.id },
      update: {
        title: mantraData.title,
        category: mantraData.category,
        difficulty,
        verses,
        duration,
        audioUrl: mantraData.audioUrl,
      },
      create: {
        id: mantraData.id,
        title: mantraData.title,
        category: mantraData.category,
        difficulty,
        verses,
        duration,
        audioUrl: mantraData.audioUrl,
      },
    });

    console.log(`✅ Seeded mantra: ${mantra.title} (${mantra.id})`);
  }

  console.log('🎉 Mantras seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding mantras:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
