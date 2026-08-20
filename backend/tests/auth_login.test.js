const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const authConfig = require('../src/config/auth');

async function runLoginTests() {
  console.log('=== STARTING LOGIN & JWT TEST SUITE ===');
  let server;
  let testsPassed = 0;
  const testUsersToClean = [];

  try {
    // Start local test server on dynamic port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        resolve();
      });
    });

    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;

    async function request(path, options = {}) {
      const res = await fetch(`${baseUrl}${path}`, {
        method: options.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      const data = await res.json();
      return { status: res.status, body: data };
    }

    // Seed test users for all 3 roles: PATIENT, DOCTOR, ADMIN
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 10);

    const patientEmail = `patient.login.${Date.now()}@example.com`;
    const doctorEmail = `doctor.login.${Date.now()}@example.com`;
    const adminEmail = `admin.login.${Date.now()}@example.com`;

    const patientUser = await prisma.user.create({
      data: { name: 'Test Patient', email: patientEmail, passwordHash, role: 'PATIENT' }
    });
    testUsersToClean.push(patientUser.id);

    const doctorUser = await prisma.user.create({
      data: { name: 'Dr. Test', email: doctorEmail, passwordHash, role: 'DOCTOR' }
    });
    testUsersToClean.push(doctorUser.id);

    const adminUser = await prisma.user.create({
      data: { name: 'Test Admin', email: adminEmail, passwordHash, role: 'ADMIN' }
    });
    testUsersToClean.push(adminUser.id);

    // TEST 1: Patient Login & JWT Verification
    console.log('\n[TEST 1] Testing Patient login & JWT verification...');
    const patientLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: patientEmail, password }
    });

    if (
      patientLoginRes.status === 200 &&
      patientLoginRes.body.success === true &&
      patientLoginRes.body.data.token &&
      patientLoginRes.body.data.user.email === patientEmail &&
      patientLoginRes.body.data.user.role === 'PATIENT' &&
      patientLoginRes.body.data.user.password === undefined &&
      patientLoginRes.body.data.user.passwordHash === undefined
    ) {
      // Verify JWT payload claims
      const decoded = jwt.verify(patientLoginRes.body.data.token, authConfig.jwtSecret);
      if (decoded.sub === patientUser.id && decoded.email === patientEmail && decoded.role === 'PATIENT' && decoded.exp) {
        console.log('PASS: Patient login succeeded. JWT verified with correct sub, email, role, and exp claims.');
        testsPassed++;
      } else {
        throw new Error(`FAILED: JWT payload claims invalid: ${JSON.stringify(decoded)}`);
      }
    } else {
      throw new Error(`FAILED: Patient login returned unexpected response: ${JSON.stringify(patientLoginRes.body)}`);
    }

    // TEST 2: Doctor Login
    console.log('\n[TEST 2] Testing Doctor login...');
    const doctorLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: doctorEmail, password }
    });

    if (
      doctorLoginRes.status === 200 &&
      doctorLoginRes.body.data.user.role === 'DOCTOR'
    ) {
      const decoded = jwt.verify(doctorLoginRes.body.data.token, authConfig.jwtSecret);
      if (decoded.role === 'DOCTOR') {
        console.log('PASS: Doctor login succeeded and JWT role claim is DOCTOR.');
        testsPassed++;
      } else {
        throw new Error('FAILED: Doctor JWT role claim is not DOCTOR.');
      }
    } else {
      throw new Error('FAILED: Doctor login failed.');
    }

    // TEST 3: Admin Login
    console.log('\n[TEST 3] Testing Admin login...');
    const adminLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password }
    });

    if (
      adminLoginRes.status === 200 &&
      adminLoginRes.body.data.user.role === 'ADMIN'
    ) {
      const decoded = jwt.verify(adminLoginRes.body.data.token, authConfig.jwtSecret);
      if (decoded.role === 'ADMIN') {
        console.log('PASS: Admin login succeeded and JWT role claim is ADMIN.');
        testsPassed++;
      } else {
        throw new Error('FAILED: Admin JWT role claim is not ADMIN.');
      }
    } else {
      throw new Error('FAILED: Admin login failed.');
    }

    // TEST 4: Wrong Password Rejection (401)
    console.log('\n[TEST 4] Testing wrong password rejection...');
    const wrongPassRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: patientEmail, password: 'WrongPassword123' }
    });

    if (
      wrongPassRes.status === 401 &&
      wrongPassRes.body.success === false &&
      wrongPassRes.body.error.code === 'INVALID_CREDENTIALS' &&
      wrongPassRes.body.error.message === 'Invalid email or password'
    ) {
      console.log('PASS: Wrong password correctly rejected with 401 Unauthorized.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Wrong password test returned unexpected response: ${JSON.stringify(wrongPassRes.body)}`);
    }

    // TEST 5: Unknown Email Rejection (401)
    console.log('\n[TEST 5] Testing unknown email rejection...');
    const unknownEmailRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'nonexistent.user.12345@example.com', password: 'Password123!' }
    });

    if (
      unknownEmailRes.status === 401 &&
      unknownEmailRes.body.error.code === 'INVALID_CREDENTIALS' &&
      unknownEmailRes.body.error.message === 'Invalid email or password'
    ) {
      console.log('PASS: Unknown email correctly rejected with generic 401 Unauthorized (enumeration prevented).');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Unknown email test returned unexpected response: ${JSON.stringify(unknownEmailRes.body)}`);
    }

    // TEST 6: Missing Email Rejection (400)
    console.log('\n[TEST 6] Testing missing email rejection...');
    const missingEmailRes = await request('/api/auth/login', {
      method: 'POST',
      body: { password }
    });

    if (missingEmailRes.status === 400 && missingEmailRes.body.error.code === 'VALIDATION_ERROR') {
      console.log('PASS: Missing email rejected with 400 Bad Request.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Missing email check did not fail as expected.');
    }

    // TEST 7: Missing Password Rejection (400)
    console.log('\n[TEST 7] Testing missing password rejection...');
    const missingPassRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: patientEmail }
    });

    if (missingPassRes.status === 400 && missingPassRes.body.error.code === 'VALIDATION_ERROR') {
      console.log('PASS: Missing password rejected with 400 Bad Request.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Missing password check did not fail as expected.');
    }

    // TEST 8: Registration Regression Test
    console.log('\n[TEST 8] Testing registration regression (Registration still works)...');
    const newRegEmail = `reg.regression.${Date.now()}@example.com`;
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Reg Test', email: newRegEmail, password: 'NewPassword123' }
    });

    if (regRes.status === 201 && regRes.body.data.id) {
      testUsersToClean.push(regRes.body.data.id);
      console.log('PASS: Registration regression passed. Registration operates normally alongside login.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Registration regression test failed.');
    }

    console.log(`\n=== ALL ${testsPassed}/8 LOGIN & JWT TESTS PASSED SUCCESSFULLY ===`);
  } catch (err) {
    console.error('\nLOGIN_TEST_FAILED:', err.message);
    process.exit(1);
  } finally {
    // Cleanup test users
    for (const userId of testUsersToClean) {
      try {
        await prisma.user.delete({ where: { id: userId } });
      } catch (e) {
        // ignore
      }
    }
    if (server) server.close();
    await prisma.$disconnect();
  }
}

runLoginTests();
