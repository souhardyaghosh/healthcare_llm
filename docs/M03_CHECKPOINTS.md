# M03 Checkpoints — Authentication + RBAC

## Block 0 Checkpoint — Inspection + Preparation
- **Status**: PASS
- **Summary**: Inspected existing `User` model, backend environment, logger, and Git repository state. Confirmed `User` model contains `passwordHash` and `role` (`PATIENT`, `DOCTOR`, `ADMIN`). No schema modifications required. Created M03 documentation log files in `docs/`.

## Block 1 Checkpoint — Authentication Dependencies + Configuration
- **Status**: PASS
- **Summary**: Installed `bcryptjs` (v3.0.3) and `jsonwebtoken` (v9.0.3). Configured `JWT_SECRET` and `JWT_EXPIRES_IN` in `backend/.env`, created `backend/src/config/auth.js`, and added environment validation in `backend/src/config/env.js`. Verified backend server `/api/health` HTTP 200 regression (`database: { connected: true }`). Committed and pushed to `main`.

## Block 2 Checkpoint — Password Hashing + Registration
- **Status**: PASS
- **Summary**: Implemented `POST /api/auth/register` with input validation, bcrypt password hashing (10 rounds), PATIENT role enforcement, duplicate email 409 conflict handling, and password/passwordHash sanitization. Verified 7/7 test cases in `backend/tests/auth_registration.test.js` and confirmed backend `/api/health` HTTP 200 regression. Committed and pushed to `main`.


