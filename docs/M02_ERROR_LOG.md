# M02 — Error Log

| Error ID | Date / Time | Block | Command / Action | Exact Error | Root Cause | Fix | Verification | Final Status |
|---|---|---|---|---|---|---|---|---|
| ERR-M02-00 | 2026-08-20 | Block 0 | Inspection | None | N/A | N/A | All Block 0 environment inspections completed successfully. | PASS |
| ERR-M02-01 | 2026-08-20 | Block 1 | Table DDL Test | `ERROR: permission denied for schema public` | PostgreSQL 15+ revokes default schema `public` `CREATE` privileges from non-superusers. | Executed `GRANT ALL ON SCHEMA public TO healthcare_user; ALTER SCHEMA public OWNER TO healthcare_user;` via superuser. | Re-ran DDL test script as `healthcare_user`; verified `CREATE TABLE` and `DROP TABLE` succeed (`PERMISSION_OK`). | PASS |
| ERR-M02-02 | 2026-08-20 | Block 4 | Prisma Migration | `ERROR: permission denied to create database` | `prisma migrate dev` requires creating a shadow database to calculate schema diffs, which requires `CREATEDB` privilege. | Executed `ALTER USER healthcare_user CREATEDB;` via superuser. | Re-ran `prisma migrate dev --name init_healthcare_schema`; migration applied cleanly and generated Prisma Client. | PASS |

