# M05 — Checkpoints Log

## Block 0 Checkpoint — Inspection + Preparation
- **Status**: PASS
- **Summary**: Inspected existing `WorkingHour` and `DoctorProfile` Prisma models. Determined `doctorId` relationship, `dayOfWeek` integer representation (`0-6`), `startTime`/`endTime` string format (`"HH:mm"`), and `isActive` boolean. Determined schema enhancement to add `slotDurationMinutes Int @default(30)` to `WorkingHour`. Established authorization rules (`ADMIN` & `DOCTOR` allowed, `PATIENT` blocked). Verified clean Git state.

## Block 1 Checkpoint — Working Hours Backend API
- **Status**: PASS
- **Summary**: Enhanced `WorkingHour` model in `schema.prisma` with `slotDurationMinutes` and `@@unique([doctorId, dayOfWeek])` constraint, executed migration `add_slot_duration_to_working_hour`. Implemented request validation (`workingHour.validation.js`), transactional controller (`workingHour.controller.js`), and routes (`workingHour.routes.js`) mounted at `/api/doctors/:doctorId/working-hours`. Built test suite `working_hours.test.js` verifying 8/8 test sections (Admin save/retrieval, Doctor self-management, Cross-Doctor 403 blocking, Patient 403 blocking, Unauth 401 blocking, full Validation matrix, Transaction safety rollback, and M01-M04 regression). Committed and pushed to `main`.

