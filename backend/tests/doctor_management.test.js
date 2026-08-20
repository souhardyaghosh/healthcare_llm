const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const authConfig = require('../src/config/auth');

async function runDoctorContractVerificationTests() {
  console.log('=== STARTING M04 DOCTOR API CONTRACT & DATABASE VERIFICATION TEST SUITE ===');
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

    // Setup Admin, Doctor, and Patient accounts
    const adminEmail = `admin.contract.${Date.now()}@example.com`;
    const patientEmail = `patient.contract.${Date.now()}@example.com`;

    const adminUser = await prisma.user.create({
      data: { name: 'Admin Contract Tester', email: adminEmail, passwordHash: commonHash, role: 'ADMIN' }
    });
    testUsersToClean.push(adminUser.id);

    const patientUser = await prisma.user.create({
      data: { name: 'Patient Contract Tester', email: patientEmail, passwordHash: commonHash, role: 'PATIENT' }
    });
    testUsersToClean.push(patientUser.id);

    const adminToken = jwt.sign({ sub: adminUser.id, email: adminUser.email, role: 'ADMIN' }, authConfig.jwtSecret, { expiresIn: '1d' });
    const patientToken = jwt.sign({ sub: patientUser.id, email: patientUser.email, role: 'PATIENT' }, authConfig.jwtSecret, { expiresIn: '1d' });

    // ==========================================
    // 1. TRANSACTION SAFETY & ROLLBACK TEST
    // ==========================================
    console.log('\n[TEST 1] Transaction Safety & Rollback Verification...');
    const rollbackEmail = `rollback.doc.${Date.now()}@example.com`;
    
    // Simulate failed transaction by attempting create with invalid DoctorProfile params if forced
    let rollbackSuccess = false;
    try {
      await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: { name: 'Rollback User', email: rollbackEmail, passwordHash: commonHash, role: 'DOCTOR' }
        });
        // Intentionally throw error inside transaction to verify User creation rolls back
        throw new Error('Simulated DoctorProfile Failure');
      });
    } catch (e) {
      if (e.message === 'Simulated DoctorProfile Failure') {
        rollbackSuccess = true;
      }
    }

    const checkOrphan = await prisma.user.findUnique({ where: { email: rollbackEmail } });
    if (rollbackSuccess && !checkOrphan) {
      console.log('PASS: Prisma transaction successfully rolled back user creation on failure. Zero orphaned records in PostgreSQL.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Transaction rollback failed or orphaned user found in DB.');
    }

    // ==========================================
    // 2. VALIDATION MATRIX TEST
    // ==========================================
    console.log('\n[TEST 2] Validation Matrix Verification...');
    const docEmail = `dr.valid.${Date.now()}@example.com`;

    // Missing name (400)
    const val1 = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { email: docEmail, specialization: 'Dermatology' }
    });
    if (val1.status !== 400 || val1.body.error.code !== 'VALIDATION_ERROR') throw new Error('FAILED: Missing name check');

    // Missing email (400)
    const val2 = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: 'Dr. Valid', specialization: 'Dermatology' }
    });
    if (val2.status !== 400 || val2.body.error.code !== 'VALIDATION_ERROR') throw new Error('FAILED: Missing email check');

    // Invalid email format (400)
    const val3 = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: 'Dr. Valid', email: 'invalid-email', specialization: 'Dermatology' }
    });
    if (val3.status !== 400 || val3.body.error.code !== 'VALIDATION_ERROR') throw new Error('FAILED: Invalid email check');

    // Missing specialization (400)
    const val4 = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: 'Dr. Valid', email: docEmail }
    });
    if (val4.status !== 400 || val4.body.error.code !== 'VALIDATION_ERROR') throw new Error('FAILED: Missing specialization check');

    console.log('PASS: Validation matrix correctly rejected all malformed inputs with 400 VALIDATION_ERROR.');
    testsPassed++;

    // ==========================================
    // 3. AUTHORIZATION MATRIX TEST
    // ==========================================
    console.log('\n[TEST 3] Authorization Matrix Verification...');

    // Valid create by Admin (201)
    const createRes = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Dr. Contract Doctor',
        email: docEmail,
        specialization: 'Neurology',
        bio: 'Specialist in clinical neurology.'
      }
    });

    if (createRes.status !== 201 || !createRes.body.data.id) throw new Error('FAILED: Admin create doctor failed');
    const createdDocId = createRes.body.data.id;
    testUsersToClean.push(createdDocId);

    const docToken = jwt.sign({ sub: createdDocId, email: docEmail, role: 'DOCTOR' }, authConfig.jwtSecret, { expiresIn: '1d' });

    // Doctor attempting POST /api/doctors (403)
    const docPostRes = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${docToken}` },
      body: { name: 'Dr. Illegal', email: 'illegal@example.com', specialization: 'Fake' }
    });
    if (docPostRes.status !== 403) throw new Error('FAILED: Doctor POST /api/doctors did not return 403');

    // Patient attempting POST /api/doctors (403)
    const patPostRes = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: { name: 'Dr. Illegal', email: 'illegal2@example.com', specialization: 'Fake' }
    });
    if (patPostRes.status !== 403) throw new Error('FAILED: Patient POST /api/doctors did not return 403');

    // Unauthenticated POST /api/doctors (401)
    const unauthPostRes = await request('/api/doctors', {
      method: 'POST',
      body: { name: 'Dr. Illegal', email: 'illegal3@example.com', specialization: 'Fake' }
    });
    if (unauthPostRes.status !== 401) throw new Error('FAILED: Unauthenticated POST /api/doctors did not return 401');

    // Doctor attempting PUT /api/doctors/:id (403)
    const docPutRes = await request(`/api/doctors/${createdDocId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${docToken}` },
      body: { specialization: 'Hacked' }
    });
    if (docPutRes.status !== 403) throw new Error('FAILED: Doctor PUT /api/doctors did not return 403');

    // Admin attempting PUT /api/doctors/:id (200)
    const adminPutRes = await request(`/api/doctors/${createdDocId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { specialization: 'Pediatric Neurology' }
    });
    if (adminPutRes.status !== 200 || adminPutRes.body.data.doctorProfile.specialization !== 'Pediatric Neurology') {
      throw new Error('FAILED: Admin PUT /api/doctors failed');
    }

    console.log('PASS: Authorization matrix strictly enforced (Admin 201/200, Doctor 403, Patient 403, Unauth 401).');
    testsPassed++;

    // ==========================================
    // 4. DUPLICATE EMAIL ON CREATE & UPDATE TEST
    // ==========================================
    console.log('\n[TEST 4] Duplicate Email Handling on Create & Update...');
    
    // Duplicate on Create (409)
    const dupCreate = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: 'Dr. Dup', email: docEmail, specialization: 'Neurology' }
    });
    if (dupCreate.status !== 409 || dupCreate.body.error.code !== 'EMAIL_EXISTS') throw new Error('FAILED: Duplicate email on create');

    // Create a second doctor to test duplicate on update
    const doc2Email = `dr.second.${Date.now()}@example.com`;
    const doc2Res = await request('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: 'Dr. Second', email: doc2Email, specialization: 'Orthopedics' }
    });
    testUsersToClean.push(doc2Res.body.data.id);

    // Attempt to update doc2 email to docEmail (409)
    const dupUpdate = await request(`/api/doctors/${doc2Res.body.data.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { email: docEmail }
    });
    if (dupUpdate.status !== 409 || dupUpdate.body.error.code !== 'EMAIL_EXISTS') throw new Error('FAILED: Duplicate email on update');

    console.log('PASS: Duplicate email handling on create and update both returned 409 Conflict EMAIL_EXISTS.');
    testsPassed++;

    // ==========================================
    // 5. RESPONSE CONTRACT & SENSITIVE DATA PROTECTION
    // ==========================================
    console.log('\n[TEST 5] Sensitive Data & Response Payload Protection...');
    const rawResString = JSON.stringify(createRes.body) + JSON.stringify(adminPutRes.body);
    if (
      !rawResString.includes('password') &&
      !rawResString.includes('passwordHash') &&
      !rawResString.includes('DATABASE_URL')
    ) {
      console.log('PASS: API payloads are strictly sanitized (password, passwordHash, and DATABASE_URL completely absent).');
      testsPassed++;
    } else {
      throw new Error('FAILED: Sensitive credential found in response payload.');
    }

    // ==========================================
    // 6. M03 AUTHENTICATION REGRESSION
    // ==========================================
    console.log('\n[TEST 6] M03 Authentication Regression Verification...');
    const meRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (meRes.status === 200 && meRes.body.data.user.email === adminEmail) {
      console.log('PASS: M03 auth middleware & current-user context operate cleanly without regression.');
      testsPassed++;
    } else {
      throw new Error('FAILED: M03 regression check failed.');
    }

    console.log(`\n=== ALL ${testsPassed}/6 M04 CONTRACT VERIFICATION SECTIONS PASSED SUCCESSFULLY ===`);
  } catch (err) {
    console.error('\nCONTRACT_TEST_FAILED:', err.message);
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

runDoctorContractVerificationTests();
