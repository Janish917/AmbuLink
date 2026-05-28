import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('securepassword', 10);

  // Seed Driver
  await prisma.user.upsert({
    where: { driverId: 'DR12345' },
    update: { isVerified: true, verificationStatus: 'verified', registeredHospitalId: 'HOSP99', employmentStatus: 'active', shiftType: 'MORNING', shiftStart: '06:00', shiftEnd: '14:00', emergencyCount: 0 },
    create: {
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
  await prisma.user.upsert({
    where: { hospitalId: 'HOSP99' },
    update: { isVerified: true, verificationStatus: 'verified', lat: 28.6250, lng: 77.2250 },
    create: {
      hospitalId: 'HOSP99',
      name: 'City General Staff',
      email: 'staff@citygeneral.com',
      role: 'HOSPITAL',
      passwordHash,
      isVerified: true,
      verificationStatus: 'verified',
      lat: 28.6250,
      lng: 77.2250
    },
  });

  // Seed Hospital Staff 2 (Metro Central Medical)
  await prisma.user.upsert({
    where: { hospitalId: 'HOSP101' },
    update: { isVerified: true, verificationStatus: 'verified', lat: 28.6300, lng: 77.2300 },
    create: {
      hospitalId: 'HOSP101',
      name: 'Metro Central Medical',
      email: 'staff@metrocentral.com',
      role: 'HOSPITAL',
      passwordHash,
      isVerified: true,
      verificationStatus: 'verified',
      lat: 28.6300,
      lng: 77.2300
    },
  });

  // Seed Police
  await prisma.user.upsert({
    where: { policeId: 'POLICE1' },
    update: { isVerified: true, verificationStatus: 'verified', lat: 28.6180, lng: 77.2150 },
    create: {
      policeId: 'POLICE1',
      name: 'Traffic Command Center',
      email: 'command2@police.gov',
      role: 'POLICE',
      passwordHash,
      isVerified: true,
      verificationStatus: 'verified',
      lat: 28.6180,
      lng: 77.2150
    },
  });

  // Seed Traffic Signal 1
  await prisma.user.upsert({
    where: { email: 'signal1@ambulink.system' },
    update: { isVerified: true, verificationStatus: 'verified', lat: 28.6145, lng: 77.2110 },
    create: {
      email: 'signal1@ambulink.system',
      name: 'Connaught Place Signal 1',
      role: 'SYSTEM_NODE',
      passwordHash,
      isVerified: true,
      verificationStatus: 'verified',
      lat: 28.6145,
      lng: 77.2110
    },
  });

  // Seed Traffic Signal 2
  await prisma.user.upsert({
    where: { email: 'signal2@ambulink.system' },
    update: { isVerified: true, verificationStatus: 'verified', lat: 28.6160, lng: 77.2140 },
    create: {
      email: 'signal2@ambulink.system',
      name: 'Connaught Place Signal 2',
      role: 'SYSTEM_NODE',
      passwordHash,
      isVerified: true,
      verificationStatus: 'verified',
      lat: 28.6160,
      lng: 77.2140
    },
  });

  // Seed Traffic Signal 3
  await prisma.user.upsert({
    where: { email: 'signal3@ambulink.system' },
    update: { isVerified: true, verificationStatus: 'verified', lat: 28.6190, lng: 77.2180 },
    create: {
      email: 'signal3@ambulink.system',
      name: 'Connaught Place Signal 3',
      role: 'SYSTEM_NODE',
      passwordHash,
      isVerified: true,
      verificationStatus: 'verified',
      lat: 28.6190,
      lng: 77.2180
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
