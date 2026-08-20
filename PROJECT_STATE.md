Completed:
- M01 — Project Foundation
- M02 — Database + Prisma

Current database schema:
- User (Central identity model; id, name, email @unique, passwordHash, role enum)
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

Current API:
- GET /api/health

Current environment variables:
- PORT
- FRONTEND_URL
- NODE_ENV
- VITE_API_BASE_URL
- DATABASE_URL

Known issues:
- None

Known limitations:
- Authentication and all later application business logic are not implemented.

Next module:
- M03 — Authentication + RBAC
