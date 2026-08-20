Completed:
- M01 — Project Foundation
- M02 — Database + Prisma
- M03 — Authentication + RBAC

Current database schema:
- User (Central identity model; id, name, email @unique, passwordHash, role enum: PATIENT, DOCTOR, ADMIN)
- DoctorProfile (1-to-1 relation with User; specialization, bio)
- WorkingHour (doctor relation, dayOfWeek 0-6, startTime, endTime, isActive)
- DoctorLeave (doctor relation, startDate, endDate, reason)
- Appointment (patient/doctor relations, appointmentDate, status enum)
- SymptomForm (patient/appointment relations, symptoms, severity, notes)
- PreVisitSummary (appointment relation, summary, aiGenerated)
- VisitNotes (appointment relation, clinicalNotes, diagnosis, prescription)
- PostVisitSummary (appointment relation, summary, instructions, aiGenerated)
- Notification (user relation, title, message, type, isRead)
- CalendarConnection (user relation, provider, encrypted tokens, expiresAt, isActive)
- CalendarEvent (connection/appointment relations, externalEventId, title, timestamps)
- AuditLog (actor relation, action, entityType, entityId, details)

Current API Endpoints:
- GET /api/health
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

Current environment variables:
- PORT
- FRONTEND_URL
- NODE_ENV
- VITE_API_BASE_URL
- DATABASE_URL
- JWT_SECRET
- JWT_EXPIRES_IN

Known issues:
- None

Known limitations:
- Authentication tokens stored in browser localStorage for client MVP development architecture; session storage can be further hardened in future production stages.

Next module:
- M04 — Admin Doctor Management
