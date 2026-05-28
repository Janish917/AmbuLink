import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database tables...');
  
  // Delete in order to satisfy foreign key constraints
  await prisma.activityLog.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.emergencySession.deleteMany({});
  await prisma.user.deleteMany({});
  
  console.log('Database cleared.');
  
  console.log('Seeding clean initial data...');
  const passwordHash = await bcrypt.hash('securepassword', 10);

  // Seed Driver
  await prisma.user.create({
    data: {
      driverId: 'DR12345',
      name: 'John Driver',
      email: 'driver@ambulink.com',
      role: 'DRIVER',
      passwordHash,
      isVerified: true,
      verificationStatus: 'verified',
      registeredHospitalId: 'HOSP99',
      employmentStatus: 'active',
      shiftType: 'MORNING',
      shiftStart: '06:00',
      shiftEnd: '14:00',
      emergencyCount: 0
    },
  });

  // Seed Hospital Staff 1
  await prisma.user.create({
    data: {
      hospitalId: 'HOSP99',
      name: 'City General Staff',
      email: 'staff@citygeneral.com',
      role: 'HOSPITAL',
      passwordHash,
      isVerified: true,
      verificationStatus: 'verified'
    },
  });

  // Seed Hospital Staff 2 (Metro Central Medical)
  await prisma.user.create({
    data: {
      hospitalId: 'HOSP101',
      name: 'Metro Central Medical',
      email: 'staff@metrocentral.com',
      role: 'HOSPITAL',
      passwordHash,
      isVerified: true,
      verificationStatus: 'verified'
    },
  });

  // Seed Police
  await prisma.user.create({
    data: {
      policeId: 'POLICE1',
      name: 'Traffic Command Center',
      email: 'command2@police.gov',
      role: 'POLICE',
      passwordHash,
      isVerified: true,
      verificationStatus: 'verified'
    },
  });

  console.log('Cleanup and seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
