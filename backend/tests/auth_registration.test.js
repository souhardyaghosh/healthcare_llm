const http = require('http');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

async function runRegistrationTests() {
  console.log('=== STARTING REGISTRATION TEST SUITE ===');
  let server;
  let testsPassed = 0;
  const testEmailsToClean = [];

  try {
    // Start local test server on dynamic port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        resolve();
      });
    });

    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;

    // Helper fetch wrapper
    async function request(path, options = {}) {
      const res = await fetch(`${baseUrl}${path}`, {
        method: options.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      const data = await res.json();
      return { status: res.status, body: data };
    }

    const primaryTestEmail = `patient.test.${Date.now()}@example.com`;
    testEmailsToClean.push(primaryTestEmail);

    // TEST 1: Valid Patient Registration
    console.log('\n[TEST 1] Testing valid patient registration...');
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Alice Patient',
        email: primaryTestEmail,
        password: 'SecurePassword123'
      }
    });

    if (
      regRes.status === 201 &&
      regRes.body.success === true &&
      regRes.body.data.id &&
      regRes.body.data.email === primaryTestEmail &&
      regRes.body.data.role === 'PATIENT' &&
      regRes.body.data.password === undefined &&
      regRes.body.data.passwordHash === undefined
    ) {
      console.log('PASS: Valid registration returned 201 Created and safe user data without password/passwordHash.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Valid registration returned unexpected response: ${JSON.stringify(regRes.body)}`);
    }

    // TEST 2: Database Persistence & Bcrypt Hash Verification
    console.log('\n[TEST 2] Verifying database persistence & bcrypt hashing...');
    const dbUser = await prisma.user.findUnique({
      where: { email: primaryTestEmail }
    });

    if (
      dbUser &&
      dbUser.role === 'PATIENT' &&
      dbUser.passwordHash &&
      dbUser.passwordHash !== 'SecurePassword123'
    ) {
      const isValidPassword = await bcrypt.compare('SecurePassword123', dbUser.passwordHash);
      if (isValidPassword) {
        console.log('PASS: User persisted in PostgreSQL with valid bcrypt passwordHash and PATIENT role.');
        testsPassed++;
      } else {
        throw new Error('FAILED: bcrypt.compare failed to validate hashed password.');
      }
    } else {
      throw new Error('FAILED: Database record missing or passwordHash invalid.');
    }

    // TEST 3: Duplicate Email Conflict Rejection (409)
    console.log('\n[TEST 3] Testing duplicate email conflict rejection...');
    const dupRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Duplicate Alice',
        email: primaryTestEmail,
        password: 'AnotherPassword123'
      }
    });

    if (dupRes.status === 409 && dupRes.body.success === false && dupRes.body.error.code === 'EMAIL_EXISTS') {
      console.log('PASS: Duplicate email correctly rejected with 409 Conflict.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Duplicate email test returned unexpected response: ${JSON.stringify(dupRes.body)}`);
    }

    // TEST 4: Role Elevation Defense (Client sending role: ADMIN or DOCTOR)
    console.log('\n[TEST 4] Testing role elevation defense (client submitting role: ADMIN)...');
    const roleHackEmail = `hacker.${Date.now()}@example.com`;
    testEmailsToClean.push(roleHackEmail);

    const hackRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Hacker User',
        email: roleHackEmail,
        password: 'HackerPassword123',
        role: 'ADMIN' // Malicious attempt to self-assign ADMIN
      }
    });

    const hackDbUser = await prisma.user.findUnique({
      where: { email: roleHackEmail }
    });

    if (
      hackRes.status === 201 &&
      hackRes.body.data.role === 'PATIENT' &&
      hackDbUser &&
      hackDbUser.role === 'PATIENT'
    ) {
      console.log('PASS: Role elevation attempt defeated. Account created strictly with PATIENT role.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Role elevation defense failed! Resulting role: ${hackDbUser?.role}`);
    }

    // TEST 5: Input Validation (Missing Name)
    console.log('\n[TEST 5] Testing missing name rejection...');
    const noNameRes = await request('/api/auth/register', {
      method: 'POST',
      body: { email: 'noname@example.com', password: 'password123' }
    });
    if (noNameRes.status === 400 && noNameRes.body.error.code === 'VALIDATION_ERROR') {
      console.log('PASS: Missing name rejected with 400 Bad Request.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Missing name check did not fail as expected.');
    }

    // TEST 6: Input Validation (Invalid Email)
    console.log('\n[TEST 6] Testing invalid email rejection...');
    const invalidEmailRes = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Test User', email: 'invalid-email-format', password: 'password123' }
    });
    if (invalidEmailRes.status === 400 && invalidEmailRes.body.error.code === 'VALIDATION_ERROR') {
      console.log('PASS: Invalid email rejected with 400 Bad Request.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Invalid email check did not fail as expected.');
    }

    // TEST 7: Input Validation (Short Password)
    console.log('\n[TEST 7] Testing short password rejection...');
    const shortPassRes = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Test User', email: 'shortpass@example.com', password: '123' }
    });
    if (shortPassRes.status === 400 && shortPassRes.body.error.code === 'VALIDATION_ERROR') {
      console.log('PASS: Short password (<6 chars) rejected with 400 Bad Request.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Short password check did not fail as expected.');
    }

    console.log(`\n=== ALL ${testsPassed}/7 REGISTRATION TESTS PASSED SUCCESSFULLY ===`);
  } catch (err) {
    console.error('\nREGISTRATION_TEST_FAILED:', err.message);
    process.exit(1);
  } finally {
    // Cleanup test users
    for (const email of testEmailsToClean) {
      try {
        await prisma.user.deleteMany({ where: { email } });
      } catch (e) {
        // ignore
      }
    }
    if (server) server.close();
    await prisma.$disconnect();
  }
}

runRegistrationTests();
