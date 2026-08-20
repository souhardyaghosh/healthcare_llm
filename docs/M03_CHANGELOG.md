# M03 Changelog — Authentication + RBAC

## Block 0 — Inspection + Preparation
- `[ADDED]` `docs/M03_IMPLEMENTATION_LOG.md`
- `[ADDED]` `docs/M03_ERROR_LOG.md`
- `[ADDED]` `docs/M03_CHECKPOINTS.md`
- `[ADDED]` `docs/M03_CHANGELOG.md`

## Block 1 — Authentication Dependencies + Configuration
- `[ADDED]` `backend/src/config/auth.js`
- `[MODIFIED]` `backend/package.json`
- `[MODIFIED]` `backend/src/config/env.js`
- `[MODIFIED]` `backend/.env.example`
- `[MODIFIED]` `.env.example`
- `[MODIFIED]` `docs/M03_IMPLEMENTATION_LOG.md`
- `[MODIFIED]` `docs/M03_CHECKPOINTS.md`
- `[MODIFIED]` `docs/M03_CHANGELOG.md`

## Block 2 — Password Hashing + Registration
- `[ADDED]` `backend/src/controllers/auth.controller.js`
- `[ADDED]` `backend/src/routes/auth.routes.js`
- `[ADDED]` `backend/tests/auth_registration.test.js`
- `[MODIFIED]` `backend/src/app.js`
- `[MODIFIED]` `docs/M03_IMPLEMENTATION_LOG.md`
- `[MODIFIED]` `docs/M03_CHECKPOINTS.md`
- `[MODIFIED]` `docs/M03_CHANGELOG.md`

## Block 3 — Login + JWT
- `[ADDED]` `backend/tests/auth_login.test.js`
- `[MODIFIED]` `backend/src/controllers/auth.controller.js`
- `[MODIFIED]` `backend/src/routes/auth.routes.js`
- `[MODIFIED]` `docs/M03_IMPLEMENTATION_LOG.md`
- `[MODIFIED]` `docs/M03_CHECKPOINTS.md`
- `[MODIFIED]` `docs/M03_CHANGELOG.md`

## Block 4 — Auth Middleware + Current User
- `[ADDED]` `backend/src/middleware/auth.middleware.js`
- `[ADDED]` `backend/tests/auth_middleware.test.js`
- `[MODIFIED]` `backend/src/controllers/auth.controller.js`
- `[MODIFIED]` `backend/src/routes/auth.routes.js`
- `[MODIFIED]` `docs/M03_IMPLEMENTATION_LOG.md`
- `[MODIFIED]` `docs/M03_CHECKPOINTS.md`
- `[MODIFIED]` `docs/M03_CHANGELOG.md`

## Block 5 — Role-Based Access Control
- `[ADDED]` `backend/src/middleware/rbac.middleware.js`
- `[ADDED]` `backend/tests/auth_rbac.test.js`
- `[MODIFIED]` `backend/src/routes/auth.routes.js`
- `[MODIFIED]` `docs/M03_IMPLEMENTATION_LOG.md`
- `[MODIFIED]` `docs/M03_CHECKPOINTS.md`
- `[MODIFIED]` `docs/M03_CHANGELOG.md`





