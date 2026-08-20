const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING PRISMA SEED ---');

  // Seed Doctor User & DoctorProfile
  const doctorUser = await prisma.user.upsert({
    where: { email: 'dr.smith@example.com' },
    update: {},
    create: {
      name: 'Dr. John Smith',
      email: 'dr.smith@example.com',
      passwordHash: 'dummy_hash_for_dev_seed_only',
      role: 'DOCTOR',
      doctorProfile: {
        create: {
          specialization: 'Cardiology',
          bio: 'Experienced cardiologist specializing in preventive heart health.'
        }
      }
    },
    include: {
      doctorProfile: true
    }
  });

  console.log('Seeded Doctor User:', doctorUser.id, doctorUser.email, doctorUser.doctorProfile?.specialization);

  // Seed Patient User
  const patientUser = await prisma.user.upsert({
    where: { email: 'patient.jane@example.com' },
    update: {},
    create: {
      name: 'Jane Doe',
      email: 'patient.jane@example.com',
      passwordHash: 'dummy_hash_for_dev_seed_only',
      role: 'PATIENT'
    }
  });

  console.log('Seeded Patient User:', patientUser.id, patientUser.email);
  console.log('--- SEED COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error('SEED_ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
