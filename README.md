# Healthcare Appointment & Follow-up Manager

## Project Overview
The Healthcare Appointment & Follow-up Manager is an integrated system designed for patient appointments, doctor availability management, automated follow-up tracking, and scheduling logic.

## Current Module: M02 — Database + Prisma
This repository contains the foundation setup (Module M01 & M02) establishing:
- Clean React + Vite frontend with React Router
- Modular Node.js + Express backend with environment configuration & structured logging
- PostgreSQL database (`healthcare_db`) with application user (`healthcare_user`)
- Prisma ORM (`v6.19.3`) integration with 13 foundational database models
- Automated Prisma database migrations (`init_healthcare_schema`)
- Idempotent development seeding script (`npx prisma db seed`)
- `/api/health` monitoring endpoint with internal database ping (`database: { connected: true }`)
- Complete project documentation logs in `docs/`

## Architecture
- **Frontend**: React (v18), Vite, JavaScript, React Router (v6)
- **Backend**: Node.js, Express (v4), CORS, dotenv, Prisma Client (v6.19.3)
- **Database**: PostgreSQL (v18.6) + Prisma ORM

## Database Prerequisites & Setup

### 1. PostgreSQL Requirements
- PostgreSQL Server 18.6 running on `localhost:5432`
- Database: `healthcare_db`
- Application User: `healthcare_user` (granted DDL schema permissions and `CREATEDB` privilege)

### 2. Environment Configuration
Create `backend/.env` with your local application user credentials:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
DATABASE_URL=postgresql://healthcare_user:<PASSWORD>@localhost:5432/healthcare_db
```
*(Never commit real credentials to version control. Maintain `.env.example` templates.)*

### 3. Prisma Commands
From the `backend/` directory:
- **Run Migrations**:
  ```bash
  npx prisma migrate dev
  ```
- **Generate Prisma Client**:
  ```bash
  npx prisma generate
  ```
- **Run Development Seed**:
  ```bash
  npx prisma db seed
  ```

## Project Structure
```text
HealthcareAppointmentManager/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ApiStatus.jsx
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
│   │   │   ├── env.js
│   │   │   └── prisma.js
│   │   ├── controllers/
│   │   │   └── health.controller.js
│   │   ├── middleware/
│   │   │   ├── error.middleware.js
│   │   │   └── notFound.middleware.js
│   │   ├── routes/
│   │   │   └── health.routes.js
│   │   ├── utils/
│   │   │   └── logger.js
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   │   └── db_verification.test.js
│   ├── .env.example
│   ├── .env
│   └── package.json
├── docs/
│   ├── M01_IMPLEMENTATION_LOG.md / M01_ERROR_LOG.md / M01_CHECKPOINTS.md / M01_CHANGELOG.md
│   └── M02_IMPLEMENTATION_LOG.md / M02_ERROR_LOG.md / M02_CHECKPOINTS.md / M02_CHANGELOG.md
├── README.md
├── PROJECT_STATE.md
└── .gitignore
```

## Setup & Startup Instructions

### 1. Backend Startup
```bash
cd backend
npm install
npx prisma generate
npm run dev
```
The backend server runs on `http://localhost:5000`.

### 2. Frontend Startup
```bash
cd frontend
npm install
npm run dev
```
The frontend server runs on `http://localhost:5173`.

## Core Endpoints
- `GET /api/health`: Returns service health status JSON (`{ "success": true, "status": "ok", "service": "healthcare-appointment-manager-backend", "module": "M02", "timestamp": "...", "database": { "connected": true } }`).
- Unknown routes: Return HTTP 404 JSON (`{ "success": false, "error": { "code": "NOT_FOUND", "message": "Route not found" } }`).

## Scope & Next Module
- **Current Scope (M02)**: PostgreSQL application user, Prisma ORM installation & initialization, 13 foundational database models, migration execution, Prisma Client integration, development seed script, and database verification.
- **Future Scope (Not Implemented Yet)**: Authentication, RBAC, Doctor management, slot generation, booking, AI, email, calendar integration, background jobs.
- **Next Module**: M03 — Authentication + RBAC.
