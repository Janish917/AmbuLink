import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('securepassword', 10);

  // Seed Driver
  await prisma.user.upsert({
    where: { driverId: 'DR12345' },
    update: { isVerified: true },
    create: {
      driverId: 'DR12345',
      name: 'John Driver',
      email: 'driver@ambulink.com',
      role: 'DRIVER',
      passwordHash,
      isVerified: true
    },
  });

  // Seed Hospital Staff
  await prisma.user.upsert({
    where: { hospitalId: 'HOSP99' },
    update: { isVerified: true },
    create: {
      hospitalId: 'HOSP99',
      name: 'City General Staff',
      email: 'staff@citygeneral.com',
      role: 'HOSPITAL',
      passwordHash,
      isVerified: true
    },
  });

  // Seed Police
  await prisma.user.upsert({
    where: { policeId: 'POLICE1' },
    update: { isVerified: true },
    create: {
      policeId: 'POLICE1',
      name: 'Traffic Command Center',
      email: 'command2@police.gov',
      role: 'POLICE',
      passwordHash,
      isVerified: true
    },
  });

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
