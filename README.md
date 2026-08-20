# Healthcare Appointment & Follow-up Manager

## Project Overview
The Healthcare Appointment & Follow-up Manager is an integrated system designed for patient appointments, doctor availability management, automated follow-up tracking, and scheduling logic.

## Current Module: M01 — Project Foundation
This repository contains the foundation setup (Module M01) establishing:
- Clean React + Vite frontend with React Router
- Modular Node.js + Express backend with environment configuration & structured logging
- `/api/health` monitoring endpoint
- End-to-end CORS integration and frontend status indicator (`ApiStatus.jsx`)
- Complete project documentation logs in `docs/`

## Architecture
- **Frontend**: React (v18), Vite, JavaScript, React Router (v6)
- **Backend**: Node.js, Express (v4), CORS, dotenv
- **Database (Planned for M02)**: PostgreSQL + Prisma

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
│   ├── src/
│   │   ├── config/
│   │   │   └── env.js
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
│   ├── .env.example
│   ├── .env
│   └── package.json
├── docs/
│   ├── M01_IMPLEMENTATION_LOG.md
│   ├── M01_ERROR_LOG.md
│   ├── M01_CHECKPOINTS.md
│   └── M01_CHANGELOG.md
├── README.md
├── PROJECT_STATE.md
└── .gitignore
```

## Setup & Startup Instructions

### 1. Environment Setup
- Copy `backend/.env.example` to `backend/.env`
  ```env
  PORT=5000
  FRONTEND_URL=http://localhost:5173
  NODE_ENV=development
  ```
- Copy `frontend/.env.example` to `frontend/.env`
  ```env
  VITE_API_BASE_URL=http://localhost:5000
  ```

### 2. Backend Startup
```bash
cd backend
npm install
npm run dev
```
The backend server runs on `http://localhost:5000`.

### 3. Frontend Startup
```bash
cd frontend
npm install
npm run dev
```
The frontend server runs on `http://localhost:5173`.

## Core Endpoints
- `GET /api/health`: Returns service health status JSON (`{ "success": true, "status": "ok", "service": "healthcare-appointment-manager-backend", "module": "M01", "timestamp": "..." }`).
- Unknown routes: Return HTTP 404 JSON (`{ "success": false, "error": { "code": "NOT_FOUND", "message": "Route not found" } }`).

## Scope & Next Module
- **Current Scope (M01)**: Infrastructure foundation, client routing, Express server boilerplate, CORS, logging, health endpoint.
- **Next Module (M02)**: Database + Prisma integration.
