# M02 — Checkpoints Log

## Block 0 Checkpoint — Inspection + Preparation
- **Status**: PASS
- **Summary**: Verified M01 preservation, PostgreSQL 18.6 availability (`localhost:5432`), `healthcare_db` existence, Prisma non-installed state, and clean Git repository health.

## Block 1 Checkpoint — PostgreSQL Application User + Connection
- **Status**: PASS
- **Summary**: Configured `healthcare_user` application role and schema `public` permissions on `healthcare_db`. Tested connection and table creation privileges. Configured `DATABASE_URL` in `backend/.env` (untracked) and template in `backend/.env.example`. Verified backend `/api/health` HTTP 200 regression. Committed and pushed to `main`.

