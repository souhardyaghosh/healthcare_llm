# M02 — Implementation Log

## Block 0 — Inspection + Preparation
- Verified preservation of M01 foundation (`frontend/`, `backend/`, `docs/`, `PROJECT_STATE.md`, `README.md`).
- Verified PostgreSQL version: 18.6 running at `localhost:5432` accepting connections.
- Confirmed `healthcare_db` creation pre-completed by developer.
- Verified Prisma is NOT INSTALLED yet in `backend/package.json`.
- Verified `prisma/schema.prisma` does NOT exist yet.
- Checked Git repository health: clean working tree on `main` branch, synced with `origin/main` (`aed7ad6`).

## Block 1 — PostgreSQL Application User + Connection
- Verified existing application user `healthcare_user` on PostgreSQL (`localhost:5432`).
- Configured schema permissions: Granted `ALL PRIVILEGES` and set `ALTER SCHEMA public OWNER TO healthcare_user` on database `healthcare_db` to allow non-superuser DDL execution for Prisma migrations.
- Tested live connection using `healthcare_user` against `healthcare_db`; verified table creation/deletion (`CREATE TABLE`/`DROP TABLE`).
- Configured `backend/.env` with `DATABASE_URL=postgresql://healthcare_user:<LOCAL_PASSWORD>@localhost:5432/healthcare_db`.
- Updated `backend/.env.example` and root `.env.example` with template `DATABASE_URL=postgresql://healthcare_user:YOUR_PASSWORD@localhost:5432/healthcare_db`.
- Verified Git security: confirmed `.env` files remain ignored and untracked.
- Conducted regression check: verified backend server startup and `GET /api/health` returns HTTP 200 OK (`success: true`, `status: "ok"`).

## Block 2 — Prisma Installation + Initialization
- Installed `prisma` (`v6.19.3`) as a devDependency and `@prisma/client` (`v6.19.3`) as a dependency in `backend/`.
- Initialized Prisma schema in `backend/prisma/schema.prisma` configured with `postgresql` datasource provider reading `env("DATABASE_URL")` and `prisma-client-js` generator.
- Executed `prisma validate`: confirmed schema structure is valid.
- Executed `prisma generate`: successfully compiled Prisma Client v6.19.3 in `backend/node_modules/@prisma/client`.
- Conducted backend regression check: verified backend server startup and `GET /api/health` returns HTTP 200 OK (`success: true`, `status: "ok"`).

## Block 3 — Foundational Database Schema
- Designed and authored 13 core models in `backend/prisma/schema.prisma`:
  - `User`, `DoctorProfile`, `WorkingHour`, `DoctorLeave`, `Appointment`, `SymptomForm`, `PreVisitSummary`, `VisitNotes`, `PostVisitSummary`, `Notification`, `CalendarConnection`, `CalendarEvent`, `AuditLog`.
- Established enums `Role` (PATIENT, DOCTOR, ADMIN) and `AppointmentStatus` (PENDING, CONFIRMED, COMPLETED, CANCELLED).
- Enforced required unique constraints (`User.email`, `DoctorProfile.userId`, and 1-to-1 appointment relations for `SymptomForm`, `PreVisitSummary`, `VisitNotes`, `PostVisitSummary`).
- Added targeted indexes on foreign keys, email, doctor lookup, appointment dates, notification read state, calendar connections/events, and audit logs.
- Defined date/time persistence strategy using UTC-safe `DateTime` (`TIMESTAMP(3) WITH TIME ZONE`) and recurring `dayOfWeek`/`startTime`/`endTime` strings for working hours.
- Documented sensitive OAuth token strategy in `CalendarConnection` (`accessTokenEncrypted`/`refreshTokenEncrypted`).
- Executed `prisma format`, `prisma validate`, and `prisma generate`: verified schema validity and re-compiled Prisma Client.

## Block 4 — Database Migration
- Granted `CREATEDB` privilege to `healthcare_user` role in PostgreSQL to allow local dev shadow database creation.
- Executed initial Prisma migration `init_healthcare_schema` (`prisma migrate dev --name init_healthcare_schema`).
- Generated migration SQL artifact under `backend/prisma/migrations/*_init_healthcare_schema/migration.sql`.
- Inspected PostgreSQL database `healthcare_db` tables, primary keys, foreign keys, unique indexes, and column types:
  - Confirmed 14 total tables (`User`, `DoctorProfile`, `WorkingHour`, `DoctorLeave`, `Appointment`, `SymptomForm`, `PreVisitSummary`, `VisitNotes`, `PostVisitSummary`, `Notification`, `CalendarConnection`, `CalendarEvent`, `AuditLog`, `_prisma_migrations`).
  - Confirmed 14 primary keys (`*_pkey`), 15 foreign keys, 34 total indexes including `User_email_key` unique index.
- Executed `prisma migrate status`: confirmed `Database schema is up to date!`.
- Conducted backend regression check: verified backend server startup and `GET /api/health` returns HTTP 200 OK (`success: true`, `status: "ok"`).

## Block 5 — Prisma Client Integration
- Created reusable Prisma Client singleton in `backend/src/config/prisma.js` configured with server-side event logging.
- Integrated internal database ping (`SELECT 1`) into `backend/src/controllers/health.controller.js`.
- Preserved existing health API JSON contract (`success: true`, `status: "ok"`, `service`, `module: "M02"`, `timestamp`) and appended `database: { connected: true }`.
- Verified server-side error logging: logged database connection errors without leaking `DATABASE_URL` credentials or production stack traces.
- Conducted end-to-end regression check: verified frontend loads at `http://localhost:5173`, communicates with backend at `http://localhost:5000/api/health`, and displays `Connected`.

## Block 6 — Seed + CRUD Verification
- Authored development seed script in `backend/prisma/seed.js` using Prisma `upsert` for idempotent seeding of fictional `Doctor` (`Dr. John Smith`, `dr.smith@example.com`, Cardiology) and `Patient` (`Jane Doe`, `patient.jane@example.com`) records.
- Configured `"prisma": { "seed": "node prisma/seed.js" }` in `backend/package.json`.
- Executed `npx prisma db seed`: verified seed script creates Doctor and Patient records cleanly without duplicates.
- Created controlled database verification test suite `backend/tests/db_verification.test.js`:
  - TEST 1 (Create User + DoctorProfile): Verified 1-to-1 relationship creation and foreign key alignment (`userId === user.id`).
  - TEST 2 (Read Relational Data): Verified query with `include: { doctorProfile: true }` returns accurate nested relation.
  - TEST 3 (Duplicate Email Rejection): Verified attempting to create duplicate `email` throws `PrismaClientKnownRequestError` with code `P2002` targeting `email`.
- Conducted backend regression check: verified backend server startup and `GET /api/health` returns HTTP 200 OK (`database: { connected: true }`).






