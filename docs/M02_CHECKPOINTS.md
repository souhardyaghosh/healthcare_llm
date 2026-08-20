# M02 — Checkpoints Log

## Block 0 Checkpoint — Inspection + Preparation
- **Status**: PASS
- **Summary**: Verified M01 preservation, PostgreSQL 18.6 availability (`localhost:5432`), `healthcare_db` existence, Prisma non-installed state, and clean Git repository health.

## Block 1 Checkpoint — PostgreSQL Application User + Connection
- **Status**: PASS
- **Summary**: Configured `healthcare_user` application role and schema `public` permissions on `healthcare_db`. Tested connection and table creation privileges. Configured `DATABASE_URL` in `backend/.env` (untracked) and template in `backend/.env.example`. Verified backend `/api/health` HTTP 200 regression. Committed and pushed to `main`.

## Block 2 Checkpoint — Prisma Installation + Initialization
- **Status**: PASS
- **Summary**: Installed `prisma` v6.19.3 and `@prisma/client` v6.19.3 in `backend/`. Initialized `backend/prisma/schema.prisma` with `postgresql` datasource provider. Validated schema and generated Prisma Client. Verified backend `/api/health` HTTP 200 regression. Committed and pushed to `main`.

## Block 3 Checkpoint — Foundational Prisma Schema
- **Status**: PASS
- **Summary**: Implemented 13 foundational models (`User`, `DoctorProfile`, `WorkingHour`, `DoctorLeave`, `Appointment`, `SymptomForm`, `PreVisitSummary`, `VisitNotes`, `PostVisitSummary`, `Notification`, `CalendarConnection`, `CalendarEvent`, `AuditLog`) with correct relationships, enums, unique constraints, and indexes. Validated and generated Prisma Client v6.19.3 cleanly. Committed and pushed to `main`.

## Block 4 Checkpoint — Database Migration
- **Status**: PASS
- **Summary**: Executed initial Prisma migration `init_healthcare_schema` against `healthcare_db`. Verified 14 PostgreSQL tables, primary keys, foreign keys, unique constraints (`User_email_key`), and indexes. Confirmed clean `prisma migrate status` (`Database schema is up to date!`) and verified backend `/api/health` HTTP 200 regression. Committed and pushed to `main`.




