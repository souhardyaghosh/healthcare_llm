const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING PRISMA SEED ---');
  const commonPasswordHash = await bcrypt.hash('AdminSecret123!', 10);
  const doctorPasswordHash = await bcrypt.hash('DoctorSecret123!', 10);
  const patientPasswordHash = await bcrypt.hash('PatientSecret123!', 10);

  // Seed Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@system.com' },
    update: {
      passwordHash: commonPasswordHash,
      role: 'ADMIN'
    },
    create: {
      name: 'System Admin',
      email: 'admin@system.com',
      passwordHash: commonPasswordHash,
      role: 'ADMIN'
    }
  });
  console.log('Seeded Admin User:', adminUser.id, adminUser.email, 'Password: AdminSecret123!');

  // Seed Doctor User & DoctorProfile
  const doctorUser = await prisma.user.upsert({
    where: { email: 'dr.smith@example.com' },
    update: {
      passwordHash: doctorPasswordHash
    },
    create: {
      name: 'Dr. John Smith',
      email: 'dr.smith@example.com',
      passwordHash: doctorPasswordHash,
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
  console.log('Seeded Doctor User:', doctorUser.id, doctorUser.email, 'Password: DoctorSecret123!');

  // Seed Patient User
  const patientUser = await prisma.user.upsert({
    where: { email: 'patient.jane@example.com' },
    update: {
      passwordHash: patientPasswordHash
    },
    create: {
      name: 'Jane Doe',
      email: 'patient.jane@example.com',
      passwordHash: patientPasswordHash,
      role: 'PATIENT'
    }
  });
  console.log('Seeded Patient User:', patientUser.id, patientUser.email, 'Password: PatientSecret123!');

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
