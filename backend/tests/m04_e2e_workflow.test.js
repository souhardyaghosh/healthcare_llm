const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const authConfig = require('../src/config/auth');

async function runM04EndToEndWorkflowSuite() {
  console.log('=== STARTING M04 END-TO-END DOCTOR WORKFLOW TEST SUITE ===');
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

    // Setup dev accounts
    const adminEmail = `admin.e2e.${Date.now()}@example.com`;
    const patientEmail = `patient.e2e.${Date.now()}@example.com`;
    const doctorUserEmail = `doctor.e2e.${Date.now()}@example.com`;

    const adminUser = await prisma.user.create({
      data: { name: 'Admin E2E Tester', email: adminEmail, passwordHash: commonHash, role: 'ADMIN' }
    });
    createdUserIds.push(adminUser.id);

    const patientUser = await prisma.user.create({
      data: { name: 'Patient E2E Tester', email: patientEmail, passwordHash: commonHash, role: 'PATIENT' }
    });
    createdUserIds.push(patientUser.id);

    const doctorUser = await prisma.user.create({
      data: {
        name: 'Doctor E2E Tester',
        email: doctorUserEmail,
        passwordHash: commonHash,
        role: 'DOCTOR',
        doctorProfile: { create: { specialization: 'Radiology', bio: 'Radiologist.' } }
      }
    });
    createdUserIds.push(doctorUser.id);

    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: 'ADMIN' }, authConfig.jwtSecret, { expiresIn: '1d' });
    const patientToken = jwt.sign({ sub: patientUser.id, email: patientUser.email, role: 'PATIENT' }, authConfig.jwtSecret, { expiresIn: '1d' });
    const doctorToken = jwt.sign({ sub: doctorUser.id, email: doctorUser.email, role: 'DOCTOR' }, authConfig.jwtSecret, { expiresIn: '1d' });

    // ==========================================
    // FLOW A: CREATE DOCTOR
    // ==========================================
    console.log('\n[FLOW A] Admin Doctor Creation & DB Verification...');
    const flowADocEmail = `dr.flowa.${Date.now()}@example.com`;
    const createRes = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Dr. Flow A',
        email: flowADocEmail,
        specialization: 'Oncology',
        bio: 'Oncology specialist and researcher.'
      }
    });

    if (createRes.status !== 201 || !createRes.body.data.id) throw new Error('FAILED: Flow A Doctor creation failed');
    const flowADocId = createRes.body.data.id;
    createdUserIds.push(flowADocId);

    // Verify DB user and doctor profile
    const dbUserA = await prisma.user.findUnique({
      where: { id: flowADocId },
      include: { doctorProfile: true }
    });

    if (
      dbUserA &&
      dbUserA.role === 'DOCTOR' &&
      dbUserA.email === flowADocEmail &&
      dbUserA.doctorProfile &&
      dbUserA.doctorProfile.specialization === 'Oncology' &&
      dbUserA.doctorProfile.userId === dbUserA.id
    ) {
      console.log('PASS: Flow A successfully created doctor and verified User + DoctorProfile rows in PostgreSQL.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Flow A PostgreSQL database state mismatch.');
    }

    // ==========================================
    // FLOW B: VIEW DOCTOR
    // ==========================================
    console.log('\n[FLOW B] Retrieve Single Doctor & Match Database...');
    const viewRes = await request(`/api/doctors/${flowADocId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (
      viewRes.status === 200 &&
      viewRes.body.data.doctor.id === flowADocId &&
      viewRes.body.data.doctor.doctorProfile.specialization === 'Oncology'
    ) {
      console.log('PASS: Flow B retrieved doctor record matching PostgreSQL database.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Flow B doctor retrieval mismatch.');
    }

    // ==========================================
    // FLOW C: EDIT DOCTOR
    // ==========================================
    console.log('\n[FLOW C] Update Doctor & PostgreSQL Persistence...');
    const updatedEmail = `dr.flowc.updated.${Date.now()}@example.com`;
    const editRes = await request(`/api/doctors/${flowADocId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Dr. Flow A Updated',
        email: updatedEmail,
        specialization: 'Surgical Oncology',
        bio: 'Updated bio for surgical oncology specialist.'
      }
    });

    if (editRes.status !== 200) throw new Error('FAILED: Flow C API call failed');

    const dbUserC = await prisma.user.findUnique({
      where: { id: flowADocId },
      include: { doctorProfile: true }
    });

    if (
      dbUserC &&
      dbUserC.name === 'Dr. Flow A Updated' &&
      dbUserC.email === updatedEmail &&
      dbUserC.doctorProfile.specialization === 'Surgical Oncology'
    ) {
      console.log('PASS: Flow C successfully updated doctor info in API response and PostgreSQL database.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Flow C database values did not update properly.');
    }

    // ==========================================
    // FLOW D: DUPLICATE EMAIL PROTECTION
    // ==========================================
    console.log('\n[FLOW D] Duplicate Email Protection...');
    const dupRes = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Dr. Duplicate',
        email: updatedEmail, // already used by flowADocId
        specialization: 'General Surgery'
      }
    });

    if (dupRes.status === 409 && dupRes.body.error.code === 'EMAIL_EXISTS') {
      console.log('PASS: Flow D duplicate email correctly rejected with 409 Conflict EMAIL_EXISTS.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Flow D duplicate email check failed.');
    }

    // ==========================================
    // FLOW E: PATIENT ATTACK BLOCKING
    // ==========================================
    console.log('\n[FLOW E] Patient Role Attack Blocking...');
    const patCreate = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: { name: 'Dr. Patient Attack', email: 'pat.attack@example.com', specialization: 'Fake' }
    });
    const patEdit = await request(`/api/doctors/${flowADocId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: { specialization: 'Hacked' }
    });

    if (patCreate.status === 403 && patEdit.status === 403) {
      console.log('PASS: Flow E Patient attempts to create/edit doctors correctly blocked with HTTP 403 Forbidden.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Flow E Patient attack not blocked.');
    }

    // ==========================================
    // FLOW F: DOCTOR ATTACK BLOCKING
    // ==========================================
    console.log('\n[FLOW F] Doctor Role Attack Blocking...');
    const docCreate = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: { name: 'Dr. Doctor Attack', email: 'doc.attack@example.com', specialization: 'Fake' }
    });
    const docEdit = await request(`/api/doctors/${flowADocId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: { specialization: 'Hacked' }
    });

    if (docCreate.status === 403 && docEdit.status === 403) {
      console.log('PASS: Flow F Doctor attempts to manage other doctors correctly blocked with HTTP 403 Forbidden.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Flow F Doctor attack not blocked.');
    }

    // ==========================================
    // FLOW G: NO TOKEN UNAUTHENTICATED BLOCKING
    // ==========================================
    console.log('\n[FLOW G] Unauthenticated Request Blocking...');
    const noTokenRes = await request('/api/doctors', { method: 'POST', body: { name: 'No Token' } });
    if (noTokenRes.status === 401) {
      console.log('PASS: Flow G Unauthenticated request correctly blocked with HTTP 401 Unauthorized.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Flow G No Token check failed.');
    }

    // ==========================================
    // FLOW H: INVALID / TAMPERED TOKEN BLOCKING
    // ==========================================
    console.log('\n[FLOW H] Invalid JWT Token Blocking...');
    const invalidTokenRes = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid.tampered.jwt.token' },
      body: { name: 'Tampered Token' }
    });
    if (invalidTokenRes.status === 401) {
      console.log('PASS: Flow H Tampered JWT token correctly rejected with HTTP 401 Unauthorized.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Flow H Invalid Token check failed.');
    }

    // ==========================================
    // DATABASE INTEGRITY & CONSISTENCY CHECK
    // ==========================================
    console.log('\n[DATABASE INTEGRITY] Checking for Orphaned Records...');
    const allProfiles = await prisma.doctorProfile.findMany();
    const allUserIds = (await prisma.user.findMany({ select: { id: true } })).map(u => u.id);
    const orphanedProfiles = allProfiles.filter(p => !allUserIds.includes(p.userId));

    const doctorUsers = await prisma.user.findMany({ where: { role: 'DOCTOR' }, include: { doctorProfile: true } });
    const doctorsWithoutProfile = doctorUsers.filter(u => !u.doctorProfile);

    if (orphanedProfiles.length === 0 && doctorsWithoutProfile.length === 0) {
      console.log('PASS: PostgreSQL database integrity verified. Zero orphaned DoctorProfile records and zero DOCTOR users missing profile.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Orphaned records found in PostgreSQL database.');
    }


    // ==========================================
    // M01 / M02 / M03 SYSTEM REGRESSION
    // ==========================================
    console.log('\n[REGRESSION] Verifying M01 Health, M02 DB, and M03 Auth Systems...');
    const healthRes = await request('/api/health');
    const meRes = await request('/api/auth/me', { headers: { Authorization: `Bearer ${adminToken}` } });

    if (healthRes.status === 200 && healthRes.body.success && meRes.status === 200 && meRes.body.data.user.id === adminUser.id) {
      console.log('PASS: M01 Health, M02 Database, and M03 Auth/RBAC regression verified cleanly.');
      testsPassed++;
    } else {
      throw new Error('FAILED: M01/M02/M03 System regression check failed.');
    }

    console.log(`\n=== ALL ${testsPassed}/10 FLOWS & VERIFICATION SECTIONS PASSED SUCCESSFULLY ===`);
  } catch (err) {
    console.error('\nE2E_WORKFLOW_FAILED:', err.message);
    process.exit(1);
  } finally {
    for (const userId of createdUserIds) {
      try {
        await prisma.doctorProfile.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });
      } catch (e) {}
    }
    if (server) server.close();
    await prisma.$disconnect();
  }
}

runM04EndToEndWorkflowSuite();
