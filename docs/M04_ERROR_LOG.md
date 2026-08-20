# M04 — Error Log

## Incident 1: Admin Login Seed Hash Mismatch
- **Description**: Initial seed script `backend/prisma/seed.js` used a plain string dummy hash (`'dummy_hash_for_dev_seed_only'`), causing `bcrypt.compare` in `POST /api/auth/login` to fail authentication during Admin UI testing.
- **Root Cause**: Development seed placeholder was not hashed with `bcryptjs`.
- **Resolution**: Updated `backend/prisma/seed.js` to hash dev passwords (`AdminSecret123!`, `DoctorSecret123!`, `PatientSecret123!`) using `bcrypt.hash(password, 10)` prior to upserting dev accounts. Added quick-fill credential buttons in `AuthTest.jsx`.

## Incident 2: Prisma Relation Null Query Filter Syntax
- **Description**: `where: { doctorProfile: { is: null } }` in automated E2E test script failed due to Prisma 1-to-1 filter syntax mismatch.
- **Root Cause**: Direct `is: null` filter on 1-to-1 relation model required explicit array filter or foreign key mapping.
- **Resolution**: Updated query in `backend/tests/m04_e2e_workflow.test.js` to inspect `DoctorProfile.userId` foreign key against existing `User.id` list. Verified 0 orphaned records.
