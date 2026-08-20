# M05 — Error Log

| Incident | Description | Root Cause | Fix / Resolution | Status |
|---|---|---|---|---|
| ERR_CONNECTION_REFUSED & EADDRINUSE | `http://localhost:5173` returned `ERR_CONNECTION_REFUSED` and restarting backend thrown `EADDRINUSE :::5000` | Existing Node backend process (PID 23952) was already running on port 5000; Vite dev server on port 5173 was stopped | Confirmed existing backend on port 5000 was healthy via `GET /api/health`; launched Vite dev server on port 5173 via `npx vite --port 5173 --host` | RESOLVED |
| Blank White Page | `http://localhost:5173` loaded blank white page with no visible React UI | `WorkingHoursManagement.jsx` used CommonJS `require`/`module.exports` syntax instead of Vite ES Module `import`/`export default`, throwing uncaught `ReferenceError: require is not defined` | Refactored `WorkingHoursManagement.jsx` to ES module syntax (`import`/`export default`). Verified compilation via `npm run build` | RESOLVED |

