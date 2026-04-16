import 'dotenv/config';
import { prisma } from './lib/prisma.js';

async function main() {
  console.log('Seeding database...');

  await prisma.plan.createMany({
    data: [
      {
        name: '1 месяц',
        description: '100 ГБ трафика, 5 устройств',
        durationDays: 30,
        trafficGb: 100,
        deviceLimit: 5,
        priceKopeks: 29900,
        sortOrder: 1,
      },
      {
        name: '3 месяца',
        description: '100 ГБ/мес трафика, 5 устройств',
        durationDays: 90,
        trafficGb: 100,
        deviceLimit: 5,
        priceKopeks: 79900,
        sortOrder: 2,
      },
      {
        name: '6 месяцев',
        description: '100 ГБ/мес трафика, 5 устройств',
        durationDays: 180,
        trafficGb: 100,
        deviceLimit: 5,
        priceKopeks: 149900,
        sortOrder: 3,
      },
      {
        name: '1 год',
        description: 'Безлимит трафика, 5 устройств',
        durationDays: 365,
        trafficGb: 0,
        deviceLimit: 5,
        priceKopeks: 249900,
        sortOrder: 4,
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seeded plans');
  await prisma.$disconnect();
}

main().catch(console.error);
