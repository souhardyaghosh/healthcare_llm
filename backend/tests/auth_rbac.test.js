const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const authConfig = require('../src/config/auth');

async function runRbacTests() {
  console.log('=== STARTING RBAC TEST SUITE ===');
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

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // Seed test users for PATIENT, DOCTOR, ADMIN
    const patientUser = await prisma.user.create({
      data: { name: 'RBAC Patient', email: `patient.rbac.${Date.now()}@example.com`, passwordHash, role: 'PATIENT' }
    });
    testUsersToClean.push(patientUser.id);

    const doctorUser = await prisma.user.create({
      data: { name: 'RBAC Doctor', email: `doctor.rbac.${Date.now()}@example.com`, passwordHash, role: 'DOCTOR' }
    });
    testUsersToClean.push(doctorUser.id);

    const adminUser = await prisma.user.create({
      data: { name: 'RBAC Admin', email: `admin.rbac.${Date.now()}@example.com`, passwordHash, role: 'ADMIN' }
    });
    testUsersToClean.push(adminUser.id);

    // Generate JWT tokens
    const patientToken = jwt.sign({ sub: patientUser.id, email: patientUser.email, role: 'PATIENT' }, authConfig.jwtSecret, { expiresIn: '1d' });
    const doctorToken = jwt.sign({ sub: doctorUser.id, email: doctorUser.email, role: 'DOCTOR' }, authConfig.jwtSecret, { expiresIn: '1d' });
    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: 'ADMIN' }, authConfig.jwtSecret, { expiresIn: '1d' });

    // TEST 1: Patient, Doctor, Admin can authenticate
    console.log('\n[TEST 1] Testing authentication for PATIENT, DOCTOR, and ADMIN...');
    const patientMe = await request('/api/auth/me', { headers: { Authorization: `Bearer ${patientToken}` } });
    const doctorMe = await request('/api/auth/me', { headers: { Authorization: `Bearer ${doctorToken}` } });
    const adminMe = await request('/api/auth/me', { headers: { Authorization: `Bearer ${adminToken}` } });

    if (patientMe.status === 200 && doctorMe.status === 200 && adminMe.status === 200) {
      console.log('PASS: All 3 roles (PATIENT, DOCTOR, ADMIN) authenticated successfully.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Authentication failed for one or more roles.');
    }

    // TEST 2: Patient blocked from admin route (403)
    console.log('\n[TEST 2] Testing PATIENT blocked from ADMIN-only route...');
    const patientAdminRes = await request('/api/auth/test/admin', { headers: { Authorization: `Bearer ${patientToken}` } });
    if (patientAdminRes.status === 403 && patientAdminRes.body.error.code === 'FORBIDDEN') {
      console.log('PASS: PATIENT correctly blocked from ADMIN route with 403 Forbidden.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Patient on admin route returned: ${patientAdminRes.status}`);
    }

    // TEST 3: Doctor blocked from admin route (403)
    console.log('\n[TEST 3] Testing DOCTOR blocked from ADMIN-only route...');
    const doctorAdminRes = await request('/api/auth/test/admin', { headers: { Authorization: `Bearer ${doctorToken}` } });
    if (doctorAdminRes.status === 403 && doctorAdminRes.body.error.code === 'FORBIDDEN') {
      console.log('PASS: DOCTOR correctly blocked from ADMIN route with 403 Forbidden.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Doctor on admin route returned: ${doctorAdminRes.status}`);
    }

    // TEST 4: Admin allowed on admin route (200)
    console.log('\n[TEST 4] Testing ADMIN allowed on ADMIN-only route...');
    const adminAdminRes = await request('/api/auth/test/admin', { headers: { Authorization: `Bearer ${adminToken}` } });
    if (adminAdminRes.status === 200 && adminAdminRes.body.success === true) {
      console.log('PASS: ADMIN correctly allowed on ADMIN route with 200 OK.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Admin on admin route returned: ${adminAdminRes.status}`);
    }

    // TEST 5: Patient blocked from doctor/admin route (403)
    console.log('\n[TEST 5] Testing PATIENT blocked from DOCTOR-or-ADMIN route...');
    const patientDocRes = await request('/api/auth/test/doctor-or-admin', { headers: { Authorization: `Bearer ${patientToken}` } });
    if (patientDocRes.status === 403 && patientDocRes.body.error.code === 'FORBIDDEN') {
      console.log('PASS: PATIENT correctly blocked from DOCTOR-or-ADMIN route with 403 Forbidden.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Patient on doctor route returned: ${patientDocRes.status}`);
    }

    // TEST 6: Doctor allowed on doctor/admin route (200)
    console.log('\n[TEST 6] Testing DOCTOR allowed on DOCTOR-or-ADMIN route...');
    const doctorDocRes = await request('/api/auth/test/doctor-or-admin', { headers: { Authorization: `Bearer ${doctorToken}` } });
    if (doctorDocRes.status === 200 && doctorDocRes.body.success === true) {
      console.log('PASS: DOCTOR correctly allowed on DOCTOR-or-ADMIN route with 200 OK.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Doctor on doctor route returned: ${doctorDocRes.status}`);
    }

    // TEST 7: Admin allowed on doctor/admin route (200)
    console.log('\n[TEST 7] Testing ADMIN allowed on DOCTOR-or-ADMIN route...');
    const adminDocRes = await request('/api/auth/test/doctor-or-admin', { headers: { Authorization: `Bearer ${adminToken}` } });
    if (adminDocRes.status === 200 && adminDocRes.body.success === true) {
      console.log('PASS: ADMIN correctly allowed on DOCTOR-or-ADMIN route with 200 OK.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Admin on doctor route returned: ${adminDocRes.status}`);
    }

    // TEST 8: Unauthenticated user blocked from protected routes (401)
    console.log('\n[TEST 8] Testing unauthenticated user blocked (401)...');
    const noAuthRes = await request('/api/auth/test/admin');
    if (noAuthRes.status === 401 && noAuthRes.body.error.code === 'UNAUTHORIZED') {
      console.log('PASS: Unauthenticated request returned 401 Unauthorized.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Unauthenticated request did not return 401.');
    }

    // TEST 9: Invalid token blocked (401)
    console.log('\n[TEST 9] Testing invalid token blocked (401)...');
    const invalidTokenRes = await request('/api/auth/test/admin', { headers: { Authorization: 'Bearer invalid.token.str' } });
    if (invalidTokenRes.status === 401) {
      console.log('PASS: Invalid token request returned 401 Unauthorized.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Invalid token request did not return 401.');
    }

    // TEST 10: Role Escalation Defense
    console.log('\n[TEST 10] Testing role escalation defense...');
    // Attempt public registration sending role: ADMIN
    const hackEmail = `hacker.rbac.${Date.now()}@example.com`;
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Hacker', email: hackEmail, password: 'Password123!', role: 'ADMIN' }
    });

    if (regRes.status === 201 && regRes.body.data.id) {
      testUsersToClean.push(regRes.body.data.id);
      // Login with hacker credentials
      const hackLoginRes = await request('/api/auth/login', {
        method: 'POST',
        body: { email: hackEmail, password: 'Password123!' }
      });
      const hackToken = hackLoginRes.body.data.token;
      // Try accessing admin route
      const hackAdminRes = await request('/api/auth/test/admin', {
        headers: { Authorization: `Bearer ${hackToken}` }
      });

      if (hackAdminRes.status === 403) {
        console.log('PASS: Self-assigned role escalation attempt prevented. User created as PATIENT and blocked with 403 Forbidden.');
        testsPassed++;
      } else {
        throw new Error('FAILED: Role escalation attempt succeeded!');
      }
    } else {
      throw new Error('FAILED: Registration for role escalation test failed.');
    }

    console.log(`\n=== ALL ${testsPassed}/10 RBAC TESTS PASSED SUCCESSFULLY ===`);
  } catch (err) {
    console.error('\nRBAC_TEST_FAILED:', err.message);
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

runRbacTests();
