# M05 — Working Hours + Slot Configuration Implementation Log

## Overview
Module M05 enables authorized users (`ADMIN` and `DOCTOR`) to configure a doctor's normal working availability (working days, start/end times, slot duration, active state) stored in PostgreSQL via Prisma.

## Block 0 — Inspection + Preparation
- Inspected `schema.prisma`:
  - `WorkingHour` model related to `DoctorProfile` via `doctorId` (foreign key to `DoctorProfile.id`).
  - `dayOfWeek`: Int (`0` = Sunday, `1` = Monday, ..., `6` = Saturday).
  - `startTime`: String (`"HH:mm"` 24-hour format).
  - `endTime`: String (`"HH:mm"` 24-hour format).
  - `isActive`: Boolean (default `true`).
  - Added `slotDurationMinutes`: Int (`@default(30)`) to `WorkingHour` model to persist slot duration configuration.
- Authorization matrix:
  - `ADMIN`: Full access to create/update/retrieve working hours for any doctor.
  - `DOCTOR`: Access to create/update/retrieve working hours for their own doctor profile.
  - `PATIENT`: Forbidden (HTTP 403 Forbidden).
  - Unauthenticated: Blocked (HTTP 401 Unauthorized).
## Block 1 — Working Hours Backend API
- Added `slotDurationMinutes Int @default(30)` and `@@unique([doctorId, dayOfWeek])` to `WorkingHour` model in `backend/prisma/schema.prisma`.
- Executed Prisma migration `npx prisma migrate dev --name add_slot_duration_to_working_hour`.
- Created request validation middleware `backend/src/middleware/workingHour.validation.js`:
  - Enforces `dayOfWeek` integer `0-6` (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
  - Enforces 24-hour time format `"HH:mm"` (`00:00` - `23:59`).
  - Enforces `startTime < endTime` (rejects equal time and end before start).
  - Enforces `slotDurationMinutes` positive integer between `5` and `240` minutes.
  - Rejects duplicate `dayOfWeek` entries in a single request payload.
- Created controller `backend/src/controllers/workingHour.controller.js`:
  - `getDoctorWorkingHours`: Resolves doctor profile (by DoctorProfile.id or User.id) and returns working hours sorted by `dayOfWeek ASC`.
  - `updateDoctorWorkingHours`: Performs atomic `prisma.$transaction` deletion and creation of doctor working hours. Enforces role & ownership authorization (`ADMIN` can edit any doctor; `DOCTOR` can edit only own schedule; `PATIENT` forbidden).
- Created routes `backend/src/routes/workingHour.routes.js` and mounted at `/api/doctors/:doctorId/working-hours` in `app.js`.
## Block 2 — Database + API Integrity
- Created test suite `backend/tests/working_hours_db_verification.test.js` to verify end-to-end database persistence:
  - Verified initial creation persists exact PostgreSQL table columns (`doctorId`, `dayOfWeek: 1`, `startTime: "10:00"`, `endTime: "13:00"`, `slotDurationMinutes: 30`, `isActive: true`).
  - Verified update transition in PostgreSQL (`10:00-13:00` -> `09:00-12:00`).
  - Verified multi-day persistence (Mon, Tue, Wed) and deterministic ordering (`dayOfWeek ASC`: `[1, 2, 3]`).
  - Verified invalid transaction rollback in PostgreSQL (failed batch with invalid `15:00-12:00` Friday rejected; Thursday not committed; previous schedule preserved).
  - Verified database schema constraint `@@unique([doctorId, dayOfWeek])` (P2002 duplicate error triggered on raw duplicate insert).
  - Verified full system regression (M01 Health, M02 Database, M03 Auth/RBAC, M04 Doctor Management).


