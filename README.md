# Healthcare Appointment & Follow-up Manager

## Project Overview
The Healthcare Appointment & Follow-up Manager is an integrated system designed for patient appointments, doctor availability management, automated follow-up tracking, and scheduling logic.

## Current Module: M03 — Authentication + RBAC
This repository contains the complete foundation and authentication setup (Modules M01, M02 & M03) establishing:
- Clean React + Vite frontend with React Router and Auth UI component (`frontend/src/components/AuthTest.jsx`)
- Modular Node.js + Express backend with environment configuration, structured logging, and JWT authentication middleware
- PostgreSQL database (`healthcare_db`) with application user (`healthcare_user`)
- Prisma ORM (`v6.19.3`) integration with 13 foundational database models
- Automated Prisma database migrations (`init_healthcare_schema`)
- Idempotent development seeding script (`npx prisma db seed`)
- Secure patient registration (`POST /api/auth/register`) with bcrypt password hashing (10 salt rounds) and strict `PATIENT` role assignment
- Secure login (`POST /api/auth/login`) with generic enumeration defense and JWT generation (`1d` expiration)
- Reusable JWT authentication middleware (`backend/src/middleware/auth.middleware.js`) and current user context endpoint (`GET /api/auth/me`)
- Reusable Role-Based Access Control (RBAC) authorization middleware (`backend/src/middleware/rbac.middleware.js`) supporting `PATIENT`, `DOCTOR`, and `ADMIN` role protection with HTTP 401 Unauthorized and HTTP 403 Forbidden handling
- Automated test suites (`auth_registration.test.js`, `auth_login.test.js`, `auth_middleware.test.js`, `auth_rbac.test.js`, `auth_integration.test.js`)
- Complete project documentation logs in `docs/`

## Architecture
- **Frontend**: React (v18), Vite, JavaScript, React Router (v6)
- **Backend**: Node.js, Express (v4), CORS, dotenv, bcryptjs (v3.0.3), jsonwebtoken (v9.0.3), Prisma Client (v6.19.3)
- **Database**: PostgreSQL (v18.6) + Prisma ORM

## Security Principles & Preferences
- **Password Storage**: Passwords are hashed with `bcryptjs` using 10 salt rounds prior to storage. Plaintext passwords are never stored or logged.
- **Account Enumeration Defense**: Login provides generic HTTP 401 Unauthorized errors (`INVALID_CREDENTIALS` / `"Invalid email or password"`) for both unknown email and wrong password attempts.
- **Response Sanitization**: API responses explicitly omit sensitive fields (`password` and `passwordHash`).
- **Strict Role Elevation Protection**: Public registration is hardcoded to assign `PATIENT`. Client-supplied role parameters (e.g. `role: "ADMIN"`) are ignored.
- **Role-Based Authorization**: Authentication ("Who are you?") and authorization ("Are you allowed?") are decoupled into reusable middleware wrappers.

## Environment Configuration
Create `backend/.env` with your local configuration:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
DATABASE_URL=postgresql://healthcare_user:<PASSWORD>@localhost:5432/healthcare_db
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
JWT_EXPIRES_IN=1d
```
*(Never commit real credentials to version control. Maintain `.env.example` templates.)*

## API Endpoints

### 1. Health Monitoring
- **`GET /api/health`**: Returns service health status JSON (`{ "success": true, "status": "ok", "service": "healthcare-appointment-manager-backend", "module": "M03", "database": { "connected": true } }`).

### 2. Authentication & Current User
- **`POST /api/auth/register`**: Public patient registration.
  - **Body**: `{ "name": "Jane Doe", "email": "jane@example.com", "password": "Password123!" }`
  - **Response (201 Created)**: Returns sanitized user object (id, name, email, role: "PATIENT", createdAt).
- **`POST /api/auth/login`**: User authentication.
  - **Body**: `{ "email": "jane@example.com", "password": "Password123!" }`
  - **Response (200 OK)**: Returns JWT bearer token and user object.
- **`GET /api/auth/me`**: Returns current authenticated user context.
  - **Header**: `Authorization: Bearer <JWT>`
  - **Response (200 OK)**: Returns authenticated user identity (id, name, email, role).

### 3. Role-Based Access Control (RBAC Test Endpoints)
- **`GET /api/auth/test/admin`**: Requires `ADMIN` role (403 Forbidden for `PATIENT`/`DOCTOR`).
- **`GET /api/auth/test/doctor-or-admin`**: Requires `DOCTOR` or `ADMIN` role.
- **`GET /api/auth/test/patient-or-admin`**: Requires `PATIENT` or `ADMIN` role.

## Project Structure
```text
HealthcareAppointmentManager/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ApiStatus.jsx
│   │   │   └── AuthTest.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   └── NotFound.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── config/
│   │   │   ├── auth.js
│   │   │   ├── env.js
│   │   │   └── prisma.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   └── health.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   ├── rbac.middleware.js
│   │   │   ├── error.middleware.js
│   │   │   └── notFound.middleware.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   └── health.routes.js
│   │   ├── utils/
│   │   │   └── logger.js
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   │   ├── auth_registration.test.js
│   │   ├── auth_login.test.js
│   │   ├── auth_middleware.test.js
│   │   ├── auth_rbac.test.js
│   │   ├── auth_integration.test.js
│   │   └── db_verification.test.js
│   ├── .env.example
│   ├── .env
│   └── package.json
├── docs/
│   ├── M01_IMPLEMENTATION_LOG.md / M01_ERROR_LOG.md / M01_CHECKPOINTS.md / M01_CHANGELOG.md
│   ├── M02_IMPLEMENTATION_LOG.md / M02_ERROR_LOG.md / M02_CHECKPOINTS.md / M02_CHANGELOG.md
│   └── M03_IMPLEMENTATION_LOG.md / M03_ERROR_LOG.md / M03_CHECKPOINTS.md / M03_CHANGELOG.md
├── README.md
├── PROJECT_STATE.md
└── .gitignore
```

## Setup & Testing Instructions

### 1. Backend Server
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

### 2. Frontend Server
```bash
cd frontend
npm install
npm run dev
```

### 3. Running Automated Auth Test Suites
From `backend/`:
- `node tests/auth_registration.test.js`
- `node tests/auth_login.test.js`
- `node tests/auth_middleware.test.js`
- `node tests/auth_rbac.test.js`
- `node tests/auth_integration.test.js`

## Scope & Next Module
- **Current Scope (M03)**: JWT authentication, bcrypt password hashing, patient registration, login, current user endpoint, authentication middleware, RBAC authorization middleware (`PATIENT`, `DOCTOR`, `ADMIN`), and full end-to-end integration testing.
- **Future Scope (Not Implemented Yet)**: Admin doctor management, working hours, doctor leaves, appointment booking, AI workflows, notifications, calendar synchronization.
- **Next Module**: M04 — Admin Doctor Management.
