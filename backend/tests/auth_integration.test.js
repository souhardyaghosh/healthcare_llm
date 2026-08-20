const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const authConfig = require('../src/config/auth');

async function runIntegrationTests() {
  console.log('=== STARTING FULL AUTH INTEGRATION TEST SUITE ===');
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
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      const res = await fetch(`${baseUrl}${path}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      const data = await res.json();
      return { status: res.status, body: data };
    }

    const commonPassword = 'SecurePassword123!';
    const commonHash = await bcrypt.hash(commonPassword, 10);

    // Seed Doctor and Admin users
    const doctorEmail = `doc.e2e.${Date.now()}@example.com`;
    const adminEmail = `admin.e2e.${Date.now()}@example.com`;

    const doctorDb = await prisma.user.create({
      data: { name: 'Dr. E2E Doctor', email: doctorEmail, passwordHash: commonHash, role: 'DOCTOR' }
    });
    testUsersToClean.push(doctorDb.id);

    const adminDb = await prisma.user.create({
      data: { name: 'E2E Admin User', email: adminEmail, passwordHash: commonHash, role: 'ADMIN' }
    });
    testUsersToClean.push(adminDb.id);

    // ==========================================
    // 1. PATIENT REGISTRATION & DATABASE VERIFICATION
    // ==========================================
    console.log('\n[E2E STEP 1] Patient Registration & Database Verification...');
    const patientEmail = `patient.e2e.${Date.now()}@example.com`;

    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'E2E Patient User', email: patientEmail, password: commonPassword }
    });

    if (
      regRes.status === 201 &&
      regRes.body.success === true &&
      regRes.body.data.id &&
      regRes.body.data.email === patientEmail &&
      regRes.body.data.role === 'PATIENT' &&
      regRes.body.data.password === undefined &&
      regRes.body.data.passwordHash === undefined
    ) {
      testUsersToClean.push(regRes.body.data.id);
      
      // Verify directly in PostgreSQL via Prisma
      const dbRecord = await prisma.user.findUnique({ where: { email: patientEmail } });
      if (
        dbRecord &&
        dbRecord.role === 'PATIENT' &&
        dbRecord.passwordHash &&
        dbRecord.passwordHash !== commonPassword &&
        (await bcrypt.compare(commonPassword, dbRecord.passwordHash))
      ) {
        console.log('PASS: Patient registered and verified in PostgreSQL with valid bcrypt passwordHash and PATIENT role.');
        testsPassed++;
      } else {
        throw new Error('FAILED: Patient database record verification failed.');
      }
    } else {
      throw new Error(`FAILED: Patient registration returned unexpected response: ${JSON.stringify(regRes.body)}`);
    }

    // ==========================================
    // 2. PATIENT LOGIN & GET /api/auth/me FLOW
    // ==========================================
    console.log('\n[E2E STEP 2] Patient Login & Current User Fetch...');
    const patientLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: patientEmail, password: commonPassword }
    });

    if (patientLoginRes.status === 200 && patientLoginRes.body.data.token) {
      const patientToken = patientLoginRes.body.data.token;
      const meRes = await request('/api/auth/me', {
        headers: { Authorization: `Bearer ${patientToken}` }
      });

      if (meRes.status === 200 && meRes.body.data.user.email === patientEmail && meRes.body.data.user.role === 'PATIENT') {
        console.log('PASS: Patient login & GET /api/auth/me returned correct patient identity.');
        testsPassed++;
      } else {
        throw new Error('FAILED: Patient GET /api/auth/me failed.');
      }
    } else {
      throw new Error('FAILED: Patient login failed.');
    }

    // ==========================================
    // 3. DOCTOR LOGIN & GET /api/auth/me FLOW
    // ==========================================
    console.log('\n[E2E STEP 3] Doctor Login & Current User Fetch...');
    const doctorLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: doctorEmail, password: commonPassword }
    });

    if (doctorLoginRes.status === 200 && doctorLoginRes.body.data.user.role === 'DOCTOR') {
      const doctorToken = doctorLoginRes.body.data.token;
      const meRes = await request('/api/auth/me', {
        headers: { Authorization: `Bearer ${doctorToken}` }
      });

      if (meRes.status === 200 && meRes.body.data.user.email === doctorEmail && meRes.body.data.user.role === 'DOCTOR') {
        console.log('PASS: Doctor login & GET /api/auth/me returned correct doctor identity.');
        testsPassed++;
      } else {
        throw new Error('FAILED: Doctor GET /api/auth/me failed.');
      }
    } else {
      throw new Error('FAILED: Doctor login failed.');
    }

    // ==========================================
    // 4. ADMIN LOGIN & GET /api/auth/me FLOW
    // ==========================================
    console.log('\n[E2E STEP 4] Admin Login & Current User Fetch...');
    const adminLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: commonPassword }
    });

    if (adminLoginRes.status === 200 && adminLoginRes.body.data.user.role === 'ADMIN') {
      const adminToken = adminLoginRes.body.data.token;
      const meRes = await request('/api/auth/me', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (meRes.status === 200 && meRes.body.data.user.email === adminEmail && meRes.body.data.user.role === 'ADMIN') {
        console.log('PASS: Admin login & GET /api/auth/me returned correct admin identity.');
        testsPassed++;
      } else {
        throw new Error('FAILED: Admin GET /api/auth/me failed.');
      }
    } else {
      throw new Error('FAILED: Admin login failed.');
    }

    // ==========================================
    // 5. NEGATIVE SECURITY EDGE CASES
    // ==========================================
    console.log('\n[E2E STEP 5] Negative Security Edge Cases...');

    // Wrong password (401)
    const wrongPassRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: patientEmail, password: 'WrongPassword' }
    });
    if (wrongPassRes.status !== 401) throw new Error('FAILED: Wrong password did not return 401.');

    // Duplicate email (409)
    const dupRes = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Dup User', email: patientEmail, password: commonPassword }
    });
    if (dupRes.status !== 409) throw new Error('FAILED: Duplicate email did not return 409.');

    // Patient blocked from admin route (403)
    const patientToken = patientLoginRes.body.data.token;
    const patientAdminRes = await request('/api/auth/test/admin', {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    if (patientAdminRes.status !== 403) throw new Error('FAILED: Patient on admin route did not return 403.');

    // Doctor blocked from admin route (403)
    const doctorToken = doctorLoginRes.body.data.token;
    const doctorAdminRes = await request('/api/auth/test/admin', {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    if (doctorAdminRes.status !== 403) throw new Error('FAILED: Doctor on admin route did not return 403.');

    // Admin allowed on admin route (200)
    const adminToken = adminLoginRes.body.data.token;
    const adminAdminRes = await request('/api/auth/test/admin', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (adminAdminRes.status !== 200) throw new Error('FAILED: Admin on admin route did not return 200.');

    console.log('PASS: All negative security edge cases (401, 409, 403, 200) verified successfully.');
    testsPassed++;

    console.log(`\n=== ALL ${testsPassed}/5 E2E INTEGRATION SUITE SECTIONS PASSED SUCCESSFULLY ===`);
  } catch (err) {
    console.error('\nINTEGRATION_TEST_FAILED:', err.message);
    process.exit(1);
  } finally {
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

runIntegrationTests();
