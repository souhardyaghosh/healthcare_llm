const prisma = require('../src/config/prisma');

async function runDatabaseVerification() {
  console.log('=== STARTING DATABASE VERIFICATION TESTS ===');
  let testsPassed = 0;

  try {
    // TEST 1: User & Doctor Profile Create with Relation
    console.log('\n[TEST 1] Creating User + DoctorProfile relation...');
    const testEmail = `test.doctor.${Date.now()}@example.com`;
    const createdUser = await prisma.user.create({
      data: {
        name: 'Dr. Test Verification',
        email: testEmail,
        passwordHash: 'dummy_verification_hash',
        role: 'DOCTOR',
        doctorProfile: {
          create: {
            specialization: 'Neurology',
            bio: 'Test bio for verification.'
          }
        }
      },
      include: {
        doctorProfile: true
      }
    });

    if (createdUser.id && createdUser.doctorProfile && createdUser.doctorProfile.userId === createdUser.id) {
      console.log('PASS: User + DoctorProfile created cleanly.');
      console.log(`      User ID: ${createdUser.id}, DoctorProfile ID: ${createdUser.doctorProfile.id}`);
      testsPassed++;
    } else {
      throw new Error('FAILED: User or DoctorProfile relationship mismatch.');
    }

    // TEST 2: Read User with Relational Data
    console.log('\n[TEST 2] Reading User with relational DoctorProfile...');
    const readUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { doctorProfile: true }
    });

    if (readUser && readUser.role === 'DOCTOR' && readUser.doctorProfile.specialization === 'Neurology') {
      console.log('PASS: Relational query returned correct data.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Relational query read failed.');
    }

    // TEST 3: Duplicate Email Unique Constraint Rejection (P2002)
    console.log('\n[TEST 3] Testing duplicate email rejection...');
    try {
      await prisma.user.create({
        data: {
          name: 'Duplicate User Attempt',
          email: testEmail, // Existing email
          passwordHash: 'dummy_hash',
          role: 'PATIENT'
        }
      });
      throw new Error('FAILED: Duplicate email was improperly accepted!');
    } catch (err) {
      if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
        console.log('PASS: Duplicate email rejected by PostgreSQL/Prisma unique constraint (P2002).');
        console.log(`      Prisma Error Code: ${err.code}, Target: ${err.meta.target}`);
        testsPassed++;
      } else {
        throw new Error(`FAILED: Unexpected error during duplicate email test: ${err.message}`);
      }
    }

    // CLEANUP Test User
    console.log('\n[CLEANUP] Deleting test user...');
    await prisma.user.delete({
      where: { id: createdUser.id }
    });
    console.log('PASS: Test user deleted cleanly.');

    console.log(`\n=== ALL ${testsPassed}/3 VERIFICATION TESTS PASSED SUCCESSFULLY ===`);
  } catch (err) {
    console.error('\nVERIFICATION_FAILED:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDatabaseVerification();
