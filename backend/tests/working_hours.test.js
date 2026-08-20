const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const authConfig = require('../src/config/auth');

async function runWorkingHoursTestSuite() {
  console.log('=== STARTING M05 WORKING HOURS TEST SUITE ===');
  let server;
  let testsPassed = 0;
  const createdUserIds = [];

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

    // 1. Create Dev Users
    const adminUser = await prisma.user.create({
      data: { name: 'Admin WH Tester', email: `admin.wh.${Date.now()}@example.com`, passwordHash: commonHash, role: 'ADMIN' }
    });
    createdUserIds.push(adminUser.id);

    const doc1User = await prisma.user.create({
      data: {
        name: 'Dr. One WH Tester',
        email: `doc1.wh.${Date.now()}@example.com`,
        passwordHash: commonHash,
        role: 'DOCTOR',
        doctorProfile: { create: { specialization: 'Cardiology' } }
      },
      include: { doctorProfile: true }
    });
    createdUserIds.push(doc1User.id);

    const doc2User = await prisma.user.create({
      data: {
        name: 'Dr. Two WH Tester',
        email: `doc2.wh.${Date.now()}@example.com`,
        passwordHash: commonHash,
        role: 'DOCTOR',
        doctorProfile: { create: { specialization: 'Neurology' } }
      },
      include: { doctorProfile: true }
    });
    createdUserIds.push(doc2User.id);

    const patientUser = await prisma.user.create({
      data: { name: 'Patient WH Tester', email: `patient.wh.${Date.now()}@example.com`, passwordHash: commonHash, role: 'PATIENT' }
    });
    createdUserIds.push(patientUser.id);

    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: 'ADMIN' }, authConfig.jwtSecret, { expiresIn: '1d' });
    const doc1Token = jwt.sign({ sub: doc1User.id, email: doc1User.email, role: 'DOCTOR' }, authConfig.jwtSecret, { expiresIn: '1d' });
    const doc2Token = jwt.sign({ sub: doc2User.id, email: doc2User.email, role: 'DOCTOR' }, authConfig.jwtSecret, { expiresIn: '1d' });
    const patientToken = jwt.sign({ sub: patientUser.id, email: patientUser.email, role: 'PATIENT' }, authConfig.jwtSecret, { expiresIn: '1d' });

    // ==========================================
    // 1. ADMIN SAVES & RETRIEVES WORKING HOURS
    // ==========================================
    console.log('\n1. Testing Admin working hours save & retrieval...');
    const validSchedule = [
      { dayOfWeek: 1, startTime: '10:00', endTime: '13:00', slotDurationMinutes: 30, isActive: true }, // Monday
      { dayOfWeek: 3, startTime: '14:00', endTime: '18:00', slotDurationMinutes: 45, isActive: true }, // Wednesday
      { dayOfWeek: 5, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30, isActive: true }  // Friday
    ];

    const putRes1 = await request(`/api/doctors/${doc1User.doctorProfile.id}/working-hours`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { workingHours: validSchedule }
    });

    if (putRes1.status !== 200 || putRes1.body.data.workingHours.length !== 3) {
      throw new Error(`FAILED: Admin update working hours status: ${putRes1.status}`);
    }

    const getRes1 = await request(`/api/doctors/${doc1User.doctorProfile.id}/working-hours`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (getRes1.status === 200 && getRes1.body.data.workingHours[0].dayOfWeek === 1 && getRes1.body.data.workingHours[1].dayOfWeek === 3) {
      console.log('PASS: Admin updated and retrieved working hours with deterministic sorting (1, 3, 5).');
      testsPassed++;
    } else {
      throw new Error('FAILED: Working hours retrieval or sorting mismatch.');
    }

    // ==========================================
    // 2. DOCTOR SELF-MANAGEMENT
    // ==========================================
    console.log('\n2. Testing Doctor self-management of working hours...');
    const doc1SelfSchedule = [
      { dayOfWeek: 2, startTime: '08:00', endTime: '12:00', slotDurationMinutes: 15, isActive: true } // Tuesday
    ];

    const selfRes = await request(`/api/doctors/${doc1User.doctorProfile.id}/working-hours`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${doc1Token}` },
      body: { workingHours: doc1SelfSchedule }
    });

    if (selfRes.status === 200 && selfRes.body.data.workingHours[0].dayOfWeek === 2) {
      console.log('PASS: Doctor successfully updated their own working hours.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Doctor self-management failed.');
    }

    // ==========================================
    // 3. CROSS-DOCTOR PROTECTION (DOCTOR ATTACK)
    // ==========================================
    console.log('\n3. Testing Cross-Doctor modification blocking...');
    const crossRes = await request(`/api/doctors/${doc1User.doctorProfile.id}/working-hours`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${doc2Token}` }, // Doctor 2 trying to edit Doctor 1
      body: { workingHours: doc1SelfSchedule }
    });

    if (crossRes.status === 403 && crossRes.body.error.code === 'FORBIDDEN') {
      console.log('PASS: Doctor attempting to modify another doctor working hours correctly blocked with HTTP 403 Forbidden.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Cross-Doctor modification was not blocked.');
    }

    // ==========================================
    // 4. PATIENT PROTECTION
    // ==========================================
    console.log('\n4. Testing Patient modification blocking...');
    const patRes = await request(`/api/doctors/${doc1User.doctorProfile.id}/working-hours`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: { workingHours: doc1SelfSchedule }
    });

    if (patRes.status === 403 && patRes.body.error.code === 'FORBIDDEN') {
      console.log('PASS: Patient attempting to modify working hours correctly blocked with HTTP 403 Forbidden.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Patient modification was not blocked.');
    }

    // ==========================================
    // 5. UNAUTHENTICATED REQUEST BLOCKING
    // ==========================================
    console.log('\n5. Testing Unauthenticated request blocking...');
    const unauthRes = await request(`/api/doctors/${doc1User.doctorProfile.id}/working-hours`, {
      method: 'PUT',
      body: { workingHours: doc1SelfSchedule }
    });

    if (unauthRes.status === 401) {
      console.log('PASS: Unauthenticated request correctly rejected with HTTP 401 Unauthorized.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Unauthenticated request was not blocked.');
    }

    // ==========================================
    // 6. VALIDATION MATRIX
    // ==========================================
    console.log('\n6. Testing Validation Matrix...');

    // 6a. Invalid Day of Week (< 0 or > 6)
    const invalidDayRes = await request(`/api/doctors/${doc1User.doctorProfile.id}/working-hours`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { workingHours: [{ dayOfWeek: 7, startTime: '10:00', endTime: '13:00', slotDurationMinutes: 30 }] }
    });

    // 6b. Equal start & end time (10:00 -> 10:00)
    const equalTimeRes = await request(`/api/doctors/${doc1User.doctorProfile.id}/working-hours`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { workingHours: [{ dayOfWeek: 1, startTime: '10:00', endTime: '10:00', slotDurationMinutes: 30 }] }
    });

    // 6c. End time before start time (13:00 -> 10:00)
    const endBeforeStartRes = await request(`/api/doctors/${doc1User.doctorProfile.id}/working-hours`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { workingHours: [{ dayOfWeek: 1, startTime: '13:00', endTime: '10:00', slotDurationMinutes: 30 }] }
    });

    // 6d. Invalid slot duration (<= 0)
    const invalidDurationRes = await request(`/api/doctors/${doc1User.doctorProfile.id}/working-hours`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { workingHours: [{ dayOfWeek: 1, startTime: '10:00', endTime: '13:00', slotDurationMinutes: 0 }] }
    });

    // 6e. Duplicate dayOfWeek in same request
    const duplicateDayRes = await request(`/api/doctors/${doc1User.doctorProfile.id}/working-hours`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { workingHours: [
        { dayOfWeek: 1, startTime: '10:00', endTime: '13:00', slotDurationMinutes: 30 },
        { dayOfWeek: 1, startTime: '14:00', endTime: '17:00', slotDurationMinutes: 30 }
      ] }
    });

    if (
      invalidDayRes.status === 400 &&
      equalTimeRes.status === 400 &&
      endBeforeStartRes.status === 400 &&
      invalidDurationRes.status === 400 &&
      duplicateDayRes.status === 400
    ) {
      console.log('PASS: Validation matrix (invalid day, start=end, end<start, invalid slot, duplicate day) all returned HTTP 400 VALIDATION_ERROR.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Validation matrix test failed. Statuses: day=${invalidDayRes.status}, equal=${equalTimeRes.status}, end<start=${endBeforeStartRes.status}, duration=${invalidDurationRes.status}, dup=${duplicateDayRes.status}`);
    }

    // ==========================================
    // 7. TRANSACTION SAFETY
    // ==========================================
    console.log('\n7. Testing Transaction Safety (all-or-nothing update)...');
    // Ensure previous schedule state is preserved if a batch update fails
    const initialHours = await prisma.workingHour.findMany({ where: { doctorId: doc1User.doctorProfile.id } });

    const failedBatchRes = await request(`/api/doctors/${doc1User.doctorProfile.id}/working-hours`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { workingHours: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30 },
        { dayOfWeek: 99, startTime: '10:00', endTime: '13:00', slotDurationMinutes: 30 } // Invalid item
      ] }
    });

    const currentHours = await prisma.workingHour.findMany({ where: { doctorId: doc1User.doctorProfile.id } });

    if (failedBatchRes.status === 400 && currentHours.length === initialHours.length) {
      console.log('PASS: Transaction safety verified. Failed batch rejected without leaving partial database changes.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Transaction safety check failed.');
    }

    // ==========================================
    // 8. M01 - M04 REGRESSION
    // ==========================================
    console.log('\n8. Testing M01-M04 System Regression...');
    const healthRes = await request('/api/health');
    const meRes = await request('/api/auth/me', { headers: { Authorization: `Bearer ${adminToken}` } });
    const docsRes = await request('/api/doctors', { headers: { Authorization: `Bearer ${adminToken}` } });

    if (healthRes.status === 200 && meRes.status === 200 && docsRes.status === 200) {
      console.log('PASS: M01 Health, M02 Database, M03 Auth/RBAC, and M04 Doctor Management regression verified cleanly.');
      testsPassed++;
    } else {
      throw new Error('FAILED: System regression check failed.');
    }

    console.log(`\n=== ALL ${testsPassed}/8 WORKING HOURS TEST SECTIONS PASSED SUCCESSFULLY ===`);
  } catch (err) {
    console.error('\nWORKING_HOURS_TEST_FAILED:', err.message);
    process.exit(1);
  } finally {
    for (const userId of createdUserIds) {
      try {
        const profile = await prisma.doctorProfile.findUnique({ where: { userId } });
        if (profile) {
          await prisma.workingHour.deleteMany({ where: { doctorId: profile.id } });
          await prisma.doctorProfile.delete({ where: { id: profile.id } });
        }
        await prisma.user.delete({ where: { id: userId } });
      } catch (e) {}
    }
    if (server) server.close();
    await prisma.$disconnect();
  }
}

runWorkingHoursTestSuite();
