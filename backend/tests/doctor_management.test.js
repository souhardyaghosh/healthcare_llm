const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const authConfig = require('../src/config/auth');

async function runDoctorManagementTests() {
  console.log('=== STARTING DOCTOR MANAGEMENT BACKEND API TEST SUITE ===');
  let server;
  let testsPassed = 0;
  const testUsersToClean = [];

  try {
    await new Promise((resolve) => {
      server = app.listen(0, () => resolve());
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

    // 1. Setup Admin, Doctor, and Patient users for testing
    const adminEmail = `admin.doc.${Date.now()}@example.com`;
    const patientEmail = `patient.doc.${Date.now()}@example.com`;

    const adminUser = await prisma.user.create({
      data: { name: 'Admin Doc Tester', email: adminEmail, passwordHash: commonHash, role: 'ADMIN' }
    });
    testUsersToClean.push(adminUser.id);

    const patientUser = await prisma.user.create({
      data: { name: 'Patient Doc Tester', email: patientEmail, passwordHash: commonHash, role: 'PATIENT' }
    });
    testUsersToClean.push(patientUser.id);

    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: 'ADMIN' }, authConfig.jwtSecret, { expiresIn: '1d' });
    const patientToken = jwt.sign({ sub: patientUser.id, email: patientUser.email, role: 'PATIENT' }, authConfig.jwtSecret, { expiresIn: '1d' });

    // ==========================================
    // TEST 1: ADMIN CAN CREATE DOCTOR (201 CREATED)
    // ==========================================
    console.log('\n[TEST 1] Admin creates new doctor (POST /api/doctors)...');
    const doctorEmail = `dr.smith.${Date.now()}@example.com`;

    const createRes = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Dr. John Smith',
        email: doctorEmail,
        specialization: 'Cardiology',
        bio: 'Senior cardiologist with 15 years experience.'
      }
    });

    if (
      createRes.status === 201 &&
      createRes.body.success === true &&
      createRes.body.data.id &&
      createRes.body.data.email === doctorEmail &&
      createRes.body.data.role === 'DOCTOR' &&
      createRes.body.data.doctorProfile &&
      createRes.body.data.doctorProfile.specialization === 'Cardiology' &&
      createRes.body.data.password === undefined &&
      createRes.body.data.passwordHash === undefined
    ) {
      const createdDoctorId = createRes.body.data.id;
      testUsersToClean.push(createdDoctorId);

      // Verify directly in PostgreSQL via Prisma
      const dbDoctor = await prisma.user.findUnique({
        where: { id: createdDoctorId },
        include: { doctorProfile: true }
      });

      if (
        dbDoctor &&
        dbDoctor.role === 'DOCTOR' &&
        dbDoctor.doctorProfile &&
        dbDoctor.doctorProfile.specialization === 'Cardiology'
      ) {
        console.log('PASS: Doctor account and DoctorProfile created atomically in PostgreSQL.');
        testsPassed++;
      } else {
        throw new Error('FAILED: Doctor DB record verification failed.');
      }
    } else {
      throw new Error(`FAILED: Doctor creation returned unexpected response: ${JSON.stringify(createRes.body)}`);
    }

    const doctorId = testUsersToClean[testUsersToClean.length - 1];
    const doctorToken = jwt.sign({ sub: doctorId, email: doctorEmail, role: 'DOCTOR' }, authConfig.jwtSecret, { expiresIn: '1d' });

    // ==========================================
    // TEST 2: DUPLICATE EMAIL REJECTED (409 CONFLICT)
    // ==========================================
    console.log('\n[TEST 2] Duplicate doctor email rejected (409 Conflict)...');
    const dupRes = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Dr. Duplicate Smith',
        email: doctorEmail,
        specialization: 'Cardiology'
      }
    });

    if (dupRes.status === 409 && dupRes.body.error.code === 'EMAIL_EXISTS') {
      console.log('PASS: Duplicate email returned 409 Conflict.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Expected 409 for duplicate email, got ${dupRes.status}`);
    }

    // ==========================================
    // TEST 3: ADMIN CAN LIST DOCTORS (200 OK)
    // ==========================================
    console.log('\n[TEST 3] Admin lists all doctors (GET /api/doctors)...');
    const listRes = await request('/api/doctors', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (
      listRes.status === 200 &&
      listRes.body.success === true &&
      Array.isArray(listRes.body.data.doctors) &&
      listRes.body.data.doctors.some(d => d.id === doctorId)
    ) {
      console.log(`PASS: Doctor list returned ${listRes.body.data.count} doctors.`);
      testsPassed++;
    } else {
      throw new Error('FAILED: Get doctors list failed.');
    }

    // ==========================================
    // TEST 4: ADMIN CAN VIEW SINGLE DOCTOR (200 OK)
    // ==========================================
    console.log('\n[TEST 4] Admin views single doctor by ID (GET /api/doctors/:id)...');
    const getRes = await request(`/api/doctors/${doctorId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (
      getRes.status === 200 &&
      getRes.body.data.doctor.id === doctorId &&
      getRes.body.data.doctor.doctorProfile.specialization === 'Cardiology'
    ) {
      console.log('PASS: Retrieved single doctor details correctly.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Get single doctor failed.');
    }

    // ==========================================
    // TEST 5: ADMIN CAN UPDATE DOCTOR (200 OK)
    // ==========================================
    console.log('\n[TEST 5] Admin updates doctor specialization & bio (PUT /api/doctors/:id)...');
    const updateRes = await request(`/api/doctors/${doctorId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        specialization: 'Interventional Cardiology',
        bio: 'Updated bio: Head of Cardiology.'
      }
    });

    if (
      updateRes.status === 200 &&
      updateRes.body.data.doctorProfile.specialization === 'Interventional Cardiology' &&
      updateRes.body.data.doctorProfile.bio === 'Updated bio: Head of Cardiology.'
    ) {
      console.log('PASS: Doctor updated successfully.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Update doctor failed.');
    }

    // ==========================================
    // TEST 6: NONEXISTENT DOCTOR RETURNS 404
    // ==========================================
    console.log('\n[TEST 6] Nonexistent doctor returns 404 Not Found...');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const notFoundRes = await request(`/api/doctors/${fakeId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (notFoundRes.status === 404 && notFoundRes.body.error.code === 'DOCTOR_NOT_FOUND') {
      console.log('PASS: Nonexistent doctor returned 404.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Expected 404 for nonexistent doctor, got ${notFoundRes.status}`);
    }

    // ==========================================
    // TEST 7: PATIENT & DOCTOR BLOCKED (403 FORBIDDEN)
    // ==========================================
    console.log('\n[TEST 7] Patient and Doctor tokens blocked from management APIs (403 Forbidden)...');
    const patientBlockRes = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: { name: 'Dr. Hack', email: 'hack@example.com', specialization: 'Fake' }
    });

    const doctorBlockRes = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: { name: 'Dr. Hack2', email: 'hack2@example.com', specialization: 'Fake' }
    });

    if (patientBlockRes.status === 403 && doctorBlockRes.status === 403) {
      console.log('PASS: PATIENT and DOCTOR roles correctly blocked with 403 Forbidden.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Expected 403 for patient/doctor, got ${patientBlockRes.status} and ${doctorBlockRes.status}`);
    }

    // ==========================================
    // TEST 8: UNAUTHENTICATED BLOCKED (401 UNAUTHORIZED)
    // ==========================================
    console.log('\n[TEST 8] Unauthenticated request blocked (401 Unauthorized)...');
    const unauthRes = await request('/api/doctors');

    if (unauthRes.status === 401) {
      console.log('PASS: Unauthenticated request blocked with 401.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Expected 401 for unauthenticated request, got ${unauthRes.status}`);
    }

    // ==========================================
    // TEST 9: M01/M03 REGRESSION VERIFICATION
    // ==========================================
    console.log('\n[TEST 9] M01/M03 Regression check (/api/health & /api/auth/me)...');
    const healthRes = await request('/api/health');
    const meRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (healthRes.status === 200 && healthRes.body.database.connected === true && meRes.status === 200 && meRes.body.data.user.role === 'ADMIN') {
      console.log('PASS: M01 health check & M03 /api/auth/me operate perfectly.');
      testsPassed++;
    } else {
      throw new Error('FAILED: M01/M03 regression check failed.');
    }

    console.log(`\n=== ALL ${testsPassed}/9 DOCTOR MANAGEMENT TESTS PASSED SUCCESSFULLY ===`);
  } catch (err) {
    console.error('\nDOCTOR_TEST_FAILED:', err.message);
    process.exit(1);
  } finally {
    for (const userId of testUsersToClean) {
      try {
        await prisma.doctorProfile.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });
      } catch (e) {
        // ignore
      }
    }
    if (server) server.close();
    await prisma.$disconnect();
  }
}

runDoctorManagementTests();
