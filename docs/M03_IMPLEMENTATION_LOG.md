# M03 Implementation Log — Authentication + RBAC

## Block 0 — Inspection & Preparation
- Inspected existing project structure, dependencies (`package.json`), environment variables, logger (`logger.js`), error middleware (`error.middleware.js`), and existing API routes.
- Inspected `backend/prisma/schema.prisma`:
  - `User` model already exists with `id` (UUID), `name`, `email` (@unique), `passwordHash`, `role` (`Role` enum: `PATIENT`, `DOCTOR`, `ADMIN`), `createdAt`, and `updatedAt`.
  - Confirmed `passwordHash` field exists: YES
  - Confirmed `role` field exists: YES
  - Confirmed schema changes required: NO
- Verified Git state: clean working directory, branch `main`, remote `origin/main`, synchronized at commit `82494dc`.
- Created Module M03 documentation logs in `docs/` (`M03_IMPLEMENTATION_LOG.md`, `M03_ERROR_LOG.md`, `M03_CHECKPOINTS.md`, `M03_CHANGELOG.md`).

## Block 1 — Authentication Dependencies + Configuration
- Installed authentication dependencies in `backend/`: `bcryptjs` (v3.0.3) and `jsonwebtoken` (v9.0.3).
- Configured local environment variable `JWT_SECRET` (`dev-healthcare-jwt-secret-key-2026`) and `JWT_EXPIRES_IN` (`1d`) in `backend/.env`.
- Updated `backend/.env.example` and root `.env.example` with safe placeholder tokens (`JWT_SECRET=YOUR_JWT_SECRET`, `JWT_EXPIRES_IN=1d`).
- Implemented environment validation in `backend/src/config/env.js`: throws fatal configuration error if `JWT_SECRET` is missing/empty in non-test environments.
- Created centralized authentication configuration module at `backend/src/config/auth.js` exporting `jwtSecret`, `jwtExpiresIn`, and `bcryptSaltRounds` (10 rounds).
- Conducted M01/M02 regression testing: backend server starts cleanly on port 5000 and `GET /api/health` returns HTTP 200 OK (`database: { connected: true }`).

## Block 2 — Password Hashing + Registration
- Implemented `POST /api/auth/register` endpoint in `backend/src/controllers/auth.controller.js` and `backend/src/routes/auth.routes.js`, mounted under `/api/auth` in `backend/src/app.js`.
- Implemented input validation for `name`, `email` (format check), and `password` (minimum 6 characters).
- Implemented duplicate email check returning HTTP 409 Conflict (`EMAIL_EXISTS`).
- Implemented secure password hashing using `bcrypt.hash(password, authConfig.bcryptSaltRounds)` before database persistence.
- Enforced strict public registration role protection: client-supplied roles are ignored and public registrations strictly create `PATIENT` role users.
- Secured API response: sanitized output to exclude `password` and `passwordHash`.
- Created comprehensive test suite in `backend/tests/auth_registration.test.js`: verified all 7 test cases (valid registration, database persistence, bcrypt validation, duplicate email 409 rejection, role elevation defense, missing name 400 rejection, invalid email 400 rejection, short password 400 rejection).
- Conducted M01/M02 regression check: backend server starts cleanly on port 5000 and `GET /api/health` returns HTTP 200 OK (`database: { connected: true }`).

## Block 3 — Login + JWT
- Implemented `POST /api/auth/login` endpoint in `backend/src/controllers/auth.controller.js` and declared `/login` in `backend/src/routes/auth.routes.js`.
- Implemented input validation for `email` and `password`.
- Implemented account enumeration defense: returns generic HTTP 401 Unauthorized (`INVALID_CREDENTIALS` / `"Invalid email or password"`) for both missing users and invalid password attempts.
- Implemented secure password verification using `bcrypt.compare(password, user.passwordHash)`.
- Implemented JWT token generation using `jsonwebtoken.sign()` with essential claims: `sub` (user id), `email`, and `role`. Configured token expiration (`1d`).
- Verified multi-role authentication support: works seamlessly for `PATIENT`, `DOCTOR`, and `ADMIN` roles.
- Secured API response payload: sanitized output to exclude `password` and `passwordHash`.
- Created comprehensive test suite in `backend/tests/auth_login.test.js`: verified all 8 test cases (Patient login & JWT verification, Doctor login, Admin login, wrong password rejection, unknown email rejection, missing email rejection, missing password rejection, registration regression).
- Conducted M01/M02 regression check: backend server starts cleanly on port 5000 and `GET /api/health` returns HTTP 200 OK (`database: { connected: true }`).



