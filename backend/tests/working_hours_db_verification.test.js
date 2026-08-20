const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const authConfig = require('../src/config/auth');

async function runWorkingHoursDbVerificationSuite() {
  console.log('=== STARTING M05 WORKING HOURS DB INTEGRITY SUITE ===');
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

    // Create Dev Admin and Doctor
    const adminUser = await prisma.user.create({
      data: { name: 'Admin WH DB Integrity', email: `admin.whdb.${Date.now()}@example.com`, passwordHash: commonHash, role: 'ADMIN' }
    });
    createdUserIds.push(adminUser.id);

    const docUser = await prisma.user.create({
      data: {
        name: 'Dr. DB Integrity Tester',
        email: `doc.whdb.${Date.now()}@example.com`,
        passwordHash: commonHash,
        role: 'DOCTOR',
        doctorProfile: { create: { specialization: 'Orthopedics' } }
      },
      include: { doctorProfile: true }
    });
    createdUserIds.push(docUser.id);

    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: 'ADMIN' }, authConfig.jwtSecret, { expiresIn: '1d' });
    const doctorId = docUser.doctorProfile.id;

    // ==========================================
    // 1. INITIAL CREATION & DIRECT POSTGRESQL PERSISTENCE
    // ==========================================
    console.log('\n1. Testing initial creation and direct PostgreSQL persistence...');
    const initialPayload = [
      { dayOfWeek: 1, startTime: '10:00', endTime: '13:00', slotDurationMinutes: 30, isActive: true } // Monday
    ];

    const createRes = await request(`/api/doctors/${doctorId}/working-hours`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { workingHours: initialPayload }
    });

    if (createRes.status !== 200) {
      throw new Error(`FAILED: Initial creation returned status ${createRes.status}`);
    }

    // Directly query PostgreSQL via Prisma
    const dbRecord1 = await prisma.workingHour.findFirst({
      where: { doctorId, dayOfWeek: 1 }
    });

    if (
      dbRecord1 &&
      dbRecord1.dayOfWeek === 1 &&
      dbRecord1.startTime === '10:00' &&
      dbRecord1.endTime === '13:00' &&
      dbRecord1.slotDurationMinutes === 30 &&
      dbRecord1.isActive === true
    ) {
      console.log('PASS: Direct PostgreSQL verification confirmed exact column persistence (day: 1, 10:00-13:00, 30m, isActive: true).');
      testsPassed++;
    } else {
      throw new Error('FAILED: PostgreSQL record values did not match submitted payload.');
    }

    // ==========================================
    // 2. UPDATE VERIFICATION IN POSTGRESQL
    // ==========================================
    console.log('\n2. Testing update persistence in PostgreSQL (10:00-13:00 -> 09:00-12:00)...');
    const updatePayload = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30, isActive: true }
    ];

    const updateRes = await request(`/api/doctors/${doctorId}/working-hours`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { workingHours: updatePayload }
    });

    if (updateRes.status !== 200) {
      throw new Error(`FAILED: Update returned status ${updateRes.status}`);
    }

    const dbRecord2 = await prisma.workingHour.findFirst({
      where: { doctorId, dayOfWeek: 1 }
    });

    if (dbRecord2 && dbRecord2.startTime === '09:00' && dbRecord2.endTime === '12:00') {
      console.log('PASS: Direct PostgreSQL verification confirmed updated values (09:00-12:00).');
      testsPassed++;
    } else {
      throw new Error('FAILED: PostgreSQL record was not updated correctly.');
    }

    // ==========================================
    // 3. MULTI-DAY PERSISTENCE & DETERMINISTIC ORDERING
    // ==========================================
    console.log('\n3. Testing multi-day persistence and deterministic ordering (Mon, Tue, Wed)...');
    const multiDayPayload = [
      { dayOfWeek: 3, startTime: '14:00', endTime: '18:00', slotDurationMinutes: 45, isActive: true }, // Wed
      { dayOfWeek: 1, startTime: '10:00', endTime: '13:00', slotDurationMinutes: 30, isActive: true }, // Mon
      { dayOfWeek: 2, startTime: '10:00', endTime: '13:00', slotDurationMinutes: 30, isActive: true }  // Tue
    ];

    const multiRes = await request(`/api/doctors/${doctorId}/working-hours`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { workingHours: multiDayPayload }
    });

    if (multiRes.status !== 200) {
      throw new Error(`FAILED: Multi-day update returned status ${multiRes.status}`);
    }

    // Query API retrieval
    const getRes = await request(`/api/doctors/${doctorId}/working-hours`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const retrievedDays = getRes.body.data.workingHours.map(w => w.dayOfWeek);
    const dbCount = await prisma.workingHour.count({ where: { doctorId } });

    if (dbCount === 3 && JSON.stringify(retrievedDays) === JSON.stringify([1, 2, 3])) {
      console.log('PASS: All 3 multi-day rows persisted in PostgreSQL and API returns deterministic order [1, 2, 3].');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Multi-day persistence or ordering mismatch. Days: ${JSON.stringify(retrievedDays)}, count: ${dbCount}`);
    }

    // ==========================================
    // 4. INVALID TRANSACTION ROLLBACK IN POSTGRESQL
    // ==========================================
    console.log('\n4. Testing invalid transaction rollback in PostgreSQL...');
    const invalidBatchPayload = [
      { dayOfWeek: 4, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30 }, // Valid Thu
      { dayOfWeek: 5, startTime: '15:00', endTime: '12:00', slotDurationMinutes: 30 }  // Invalid Fri (end < start)
    ];

    const invalidTxRes = await request(`/api/doctors/${doctorId}/working-hours`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { workingHours: invalidBatchPayload }
    });

    // Check DB state remains [1, 2, 3] and Thursday (4) was NOT partially inserted
    const dbPostFail = await prisma.workingHour.findMany({ where: { doctorId }, orderBy: { dayOfWeek: 'asc' } });
    const postFailDays = dbPostFail.map(w => w.dayOfWeek);

    if (invalidTxRes.status === 400 && JSON.stringify(postFailDays) === JSON.stringify([1, 2, 3])) {
      console.log('PASS: Transaction rollback verified in PostgreSQL. Invalid batch rejected and previous schedule preserved [1, 2, 3].');
      testsPassed++;
    } else {
      throw new Error('FAILED: Transaction rollback failed or partial data was committed.');
    }

    // ==========================================
    // 5. SCHEMA UNIQUE CONSTRAINT TEST
    // ==========================================
    console.log('\n5. Testing Schema @@unique([doctorId, dayOfWeek]) constraint...');
    try {
      await prisma.workingHour.create({
        data: { doctorId, dayOfWeek: 1, startTime: '08:00', endTime: '11:00', slotDurationMinutes: 30 }
      });
      throw new Error('FAILED: Database constraint did not trigger on duplicate (doctorId, dayOfWeek).');
    } catch (dbErr) {
      if (dbErr.code === 'P2002' || dbErr.message.includes('Unique constraint')) {
        console.log('PASS: PostgreSQL @@unique([doctorId, dayOfWeek]) constraint correctly rejected raw duplicate insertion (P2002).');
        testsPassed++;
      } else {
        throw dbErr;
      }
    }

    // ==========================================
    // 6. SYSTEM REGRESSION CHECK
    // ==========================================
    console.log('\n6. Testing M01-M04 System Regression...');
    const healthRes = await request('/api/health');
    const meRes = await request('/api/auth/me', { headers: { Authorization: `Bearer ${adminToken}` } });
    const docsRes = await request('/api/doctors', { headers: { Authorization: `Bearer ${adminToken}` } });

    if (healthRes.status === 200 && meRes.status === 200 && docsRes.status === 200) {
      console.log('PASS: System regression clean across Health, Auth, RBAC, and Doctor Management.');
      testsPassed++;
    } else {
      throw new Error('FAILED: System regression failed.');
    }

    console.log(`\n=== ALL ${testsPassed}/6 DB INTEGRITY TEST SECTIONS PASSED SUCCESSFULLY ===`);
  } catch (err) {
    console.error('\nWORKING_HOURS_DB_TEST_FAILED:', err.message);
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

runWorkingHoursDbVerificationSuite();
