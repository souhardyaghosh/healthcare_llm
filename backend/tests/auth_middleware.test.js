const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const authConfig = require('../src/config/auth');

async function runMiddlewareTests() {
  console.log('=== STARTING AUTH MIDDLEWARE TEST SUITE ===');
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

    // Create test user in database
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const testEmail = `middleware.user.${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: { name: 'Middleware Test User', email: testEmail, passwordHash, role: 'PATIENT' }
    });
    testUsersToClean.push(user.id);

    // Create valid token
    const validToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtExpiresIn }
    );

    // TEST 1: Valid Bearer Token & GET /api/auth/me
    console.log('\n[TEST 1] Testing GET /api/auth/me with valid Bearer token...');
    const validRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${validToken}` }
    });

    if (
      validRes.status === 200 &&
      validRes.body.success === true &&
      validRes.body.data.user.id === user.id &&
      validRes.body.data.user.email === testEmail &&
      validRes.body.data.user.role === 'PATIENT' &&
      validRes.body.data.user.password === undefined &&
      validRes.body.data.user.passwordHash === undefined
    ) {
      console.log('PASS: GET /api/auth/me returned 200 OK with authenticated user context and no password hashes.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Valid token test returned unexpected response: ${JSON.stringify(validRes.body)}`);
    }

    // TEST 2: Missing Authorization Header Rejection (401)
    console.log('\n[TEST 2] Testing missing Authorization header...');
    const noHeaderRes = await request('/api/auth/me');
    if (noHeaderRes.status === 401 && noHeaderRes.body.error.code === 'UNAUTHORIZED') {
      console.log('PASS: Missing Authorization header rejected with 401 Unauthorized.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Missing Authorization header did not fail as expected.');
    }

    // TEST 3: Malformed Header / Missing Bearer Prefix Rejection (401)
    console.log('\n[TEST 3] Testing malformed header (missing Bearer prefix)...');
    const malformedRes = await request('/api/auth/me', {
      headers: { Authorization: `Basic ${validToken}` }
    });
    if (malformedRes.status === 401 && malformedRes.body.error.code === 'UNAUTHORIZED') {
      console.log('PASS: Malformed header rejected with 401 Unauthorized.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Malformed header did not fail as expected.');
    }

    // TEST 4: Tampered / Invalid Token Signature Rejection (401)
    console.log('\n[TEST 4] Testing tampered / invalid token signature...');
    const invalidSigToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      'wrong-signing-secret-key-1234'
    );
    const tamperedRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${invalidSigToken}` }
    });
    if (tamperedRes.status === 401 && tamperedRes.body.error.code === 'INVALID_TOKEN') {
      console.log('PASS: Tampered/invalid signature token rejected with 401 INVALID_TOKEN.');
      testsPassed++;
    } else {
      throw new Error('FAILED: Tampered token did not fail as expected.');
    }

    // TEST 5: Expired Token Rejection (401)
    console.log('\n[TEST 5] Testing expired token rejection...');
    const expiredToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      authConfig.jwtSecret,
      { expiresIn: '0s' } // Expired immediately
    );
    const expiredRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    if (expiredRes.status === 401 && expiredRes.body.error.code === 'TOKEN_EXPIRED') {
      console.log('PASS: Expired token rejected with 401 TOKEN_EXPIRED.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Expired token test returned unexpected response: ${JSON.stringify(expiredRes.body)}`);
    }

    // TEST 6: Deleted User Token Rejection (401)
    console.log('\n[TEST 6] Testing deleted user token rejection...');
    const tempUserEmail = `temp.deleted.${Date.now()}@example.com`;
    const tempUser = await prisma.user.create({
      data: { name: 'Temp User', email: tempUserEmail, passwordHash, role: 'PATIENT' }
    });
    const tempToken = jwt.sign(
      { sub: tempUser.id, email: tempUser.email, role: tempUser.role },
      authConfig.jwtSecret,
      { expiresIn: '1d' }
    );
    // Delete user from database immediately
    await prisma.user.delete({ where: { id: tempUser.id } });

    const deletedUserRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${tempToken}` }
    });
    if (deletedUserRes.status === 401 && deletedUserRes.body.error.code === 'USER_NOT_FOUND') {
      console.log('PASS: Token for deleted user rejected with 401 USER_NOT_FOUND.');
      testsPassed++;
    } else {
      throw new Error(`FAILED: Deleted user test returned unexpected response: ${JSON.stringify(deletedUserRes.body)}`);
    }

    console.log(`\n=== ALL ${testsPassed}/6 AUTH MIDDLEWARE TESTS PASSED SUCCESSFULLY ===`);
  } catch (err) {
    console.error('\nMIDDLEWARE_TEST_FAILED:', err.message);
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

runMiddlewareTests();
