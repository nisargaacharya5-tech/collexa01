# Colexa — Multi-Tenant Implementation Plan

## Executive Summary & Strict Architectural Constraints

This implementation plan translates the [Colexa Project Requirement Sheet](file:///c:/Users/nisarga%20bg/OneDrive/Desktop/Collexa/project_requirment.md) and [Colexa Database Schema](file:///c:/Users/nisarga%20bg/OneDrive/Desktop/Collexa/database_schema.md) into an enterprise-grade, production-ready system. In accordance with core directives, the architecture strictly enforces two architectural foundations across all phases:

1. **Strict Multi-Tenant Architecture**: A single deployed instance serves multiple colleges simultaneously. Tenant boundaries (`college_id`) are enforced at the network, application, and database levels (PostgreSQL Row-Level Security and scoped queries) to guarantee zero data leakage between institutions.
2. **Standardized 3-Container Docker Topology**: The development and deployment lifecycle relies strictly on three isolated containers managed via Docker Compose:
   - **Container 1 (`frontend`)**: Next.js (React / TypeScript) web application.
   - **Container 2 (`backend`)**: FastAPI (Python 3.11+) asynchronous REST API.
   - **Container 3 (`database`)**: PostgreSQL 16 relational database with persistent storage.

---

## 3-Container Docker Architecture

```
                      ┌────────────────────────────────────────┐
                      │              Host Browser              │
                      └──────────────┬──────────────────┬──────┘
                                     │ :3000            │ :8000
                                     ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Docker Network: colexa-network                                              │
│                                                                             │
│  ┌───────────────────────┐              ┌────────────────────────────────┐  │
│  │  Container 1:         │              │  Container 2:                  │  │
│  │  frontend             │ SSR / Proxy  │  backend                       │  │
│  │  (Next.js / Node 20)  ├─────────────►│  (FastAPI / Uvicorn)           │  │
│  │  Port: 3000           │              │  Port: 8000                    │  │
│  └───────────────────────┘              └───────────────┬────────────────┘  │
│                                                         │                   │
│                                                         │ Internal TCP      │
│                                                         │ Port: 5432        │
│                                                         ▼                   │
│                                         ┌────────────────────────────────┐  │
│                                         │  Container 3:                  │  │
│                                         │  database                      │  │
│                                         │  (PostgreSQL 16)               │  │
│                                         │  Volume: pgdata:/var/lib/...   │  │
│                                         └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Container Specifications

| Container | Base Image | Dev Tooling & Config | Host Port | Internal Port | Persistent Volumes / Mounts |
|---|---|---|---|---|---|
| **frontend** | `node:20-alpine` | Next.js (App Router), Hot Reload (`WATCHPACK_POLLING=true`) | `3000` | `3000` | Bind mount `./frontend:/app`, `/app/node_modules` |
| **backend** | `python:3.11-slim` | FastAPI, Uvicorn (`--reload`), Poetry/Pipenv, Alembic | `8000` | `8000` | Bind mount `./backend:/app` |
| **database** | `postgres:16-alpine` | PostgreSQL, Healthcheck (`pg_isready`), Init Scripts | `5432` | `5432` | Named volume `colexa_pgdata:/var/lib/postgresql/data` |

---

## Multi-Tenancy Strategy & Data Isolation

To prevent any possibility of cross-college data leaks in a shared instance:

1. **Discriminator Column (`college_id`)**: Every tenant-owned table (`users`, `notices`, `timetables`, `attendances`, `classes`) includes a non-nullable foreign key referencing `colleges.id`.
2. **PostgreSQL Row-Level Security (RLS)**:
   - RLS policies are enabled on all tenant-specific tables.
   - FastAPI sets a local transaction context upon acquiring a database connection:
     ```sql
     SET LOCAL app.current_college_id = 'c1a2b3c4-...';
     ```
   - Policies enforce: `USING (college_id = NULLIF(current_setting('app.current_college_id', true), '')::uuid)`.
3. **Tenant Context Resolution**:
   - Request-level resolution via custom subdomain (e.g., `mit.colexa.edu`), custom domain, or `X-College-ID` / `X-Tenant-Domain` header.
   - JWT tokens encode `college_id`, `user_id`, and `role`. The backend validates that the token's `college_id` matches the resolved tenant context.
4. **ORM-Level Automatic Filtering**:
   - SQLAlchemy session listeners automatically inject the tenant filter on all `SELECT`, `UPDATE`, and `DELETE` queries as defense-in-depth behind PostgreSQL RLS.

---

## Phased Implementation Roadmap

### Phase 1: Multi-Tenant System Architecture & Database Design
**Objective**: Translate PRD Step 5 (Entities) and Step 6 (Relations) into a multi-tenant relational schema with Docker-ready migration tooling.

* **Tenant & College Modeling**:
  * Create `colleges` root entity (id, code, name, domain, status, created_at).
  * Design unified `users` table with composite uniqueness on `(college_id, email)`.
  * Define Role enum: `STUDENT`, `FACULTY`, `ADMIN`.
* **Entity-Relationship (ER) Design**:
  * Establish foreign keys always anchored by `college_id`:
    * `colleges` 1 → N `users`
    * `colleges` 1 → N `notices`
    * `colleges` 1 → N `timetables`
    * `colleges` 1 → N `scheduled_classes`
    * `colleges` 1 → N `attendance_records`
  * Relational mapping:
    * `faculty` → records → `student_attendance` (scoped to matching `college_id`)
    * `faculty` → has → `faculty_attendance` (scoped to matching `college_id`)
    * `timetable` → defines → `scheduled_classes`
    * `student` ↔ `scheduled_classes` roster association
* **Database Migrations & RLS Scripts**:
  * Write Alembic migration baseline including table schemas, foreign key indexes, and RLS policies.
  * Implement PostgreSQL initialization script (`init-db.sh`) executed on container creation.
* **Traceability Matrix**:
  * Link every planned database entity, foreign key, and RLS policy directly to PRD Steps 5, 6, and 12.

---

### Phase 2: Docker Environment Setup & Multi-Tenant Core Infrastructure
**Objective**: Stand up the 3-container topology and implement PRD Step 8 (Access Control) and Step 10 (Non-Functional Requirements).

* **Docker Infrastructure Orchestration**:
  * Construct root `docker-compose.yml` with healthchecks (`depends_on: database: condition: service_healthy`).
  * Configure environment variable templates (`.env.example`) managing container secrets, database URLs, and JWT signing keys.
  * Set up Docker networking and container communication (`frontend` talks to `backend:8000` internally and host talks via localhost ports).
* **Multi-Tenant Authentication & Session Context**:
  * Implement password hashing (Argon2 / bcrypt) and secure JWT issuance.
  * Tenant Resolver Middleware in FastAPI:
    1. Intercept incoming HTTP request.
    2. Extract tenant identifier from Host header (subdomain) or `X-College-ID`.
    3. Validate tenant existence in cache/DB.
    4. Validate JWT payload `college_id == resolved_college_id`.
    5. Set `request.state.college_id` and execute `SET LOCAL app.current_college_id` on DB connection.
* **Role-Based Access Control (RBAC) Guards**:
  * **Admin Guard**: Restricted to CRUD on their college's Notices, Timetables, and User roster.
  * **Faculty Guard**: Write access strictly to own attendance and assigned class attendance within their college.
  * **Student Guard**: Read-only access strictly scoped to their own student UUID and college.

---

### Phase 3: Multi-Tenant Dashboard & Notice Board Development
**Objective**: Deliver PRD Step 11 user flows for the UI shell and notice engine within the Next.js container.

* **Next.js UI Framework & Component Architecture**:
  * Initialize Next.js App Router in `frontend` container with TypeScript and Tailwind CSS.
  * Implement tenant theme/branding provider derived from tenant context.
  * Build responsive layout shells for Student, Faculty, and Admin roles.
* **Notice Management Module**:
  * **Admin UI & API**: Create, publish, archive notices with target audience filters (`ALL`, `FACULTY_ONLY`, `STUDENT_ONLY`).
  * **Backend Isolation**: Automatically attach `college_id` on notice creation; enforce RLS so admins cannot view or post notices to other colleges.
  * **Student/Faculty Dashboards**: Real-time read-only feed querying active notices matching the user's role and college.
* **API Client & Container Bridge**:
  * Axios / Fetch client configured with automatic base URL detection (internal `http://backend:8000` during Next.js SSR vs. public URL in client browser).

---

### Phase 4: Timetable & Attendance Engine
**Objective**: Implement core academic operations (PRD Steps 4, 7, and 11) with strict multi-tenant integrity.

* **Timetable & Scheduling Module**:
  * Admin UI for mapping Faculty, Class/Course, Classroom, and Time Slot.
  * Automatic validation preventing room/faculty schedule overlaps within the same college.
  * Daily and weekly schedule calendar views for Students and Faculty.
* **Faculty Self-Attendance**:
  * Streamlined one-click check-in widget on Faculty dashboard recording timestamp and status.
* **Student Attendance Engine**:
  * Dynamic class roster resolution: When a faculty member opens an active class slot, fetch registered students for that class in that college.
  * Roster UI for marking `Present`, `Absent`, `Excused`, or `Late`.
  * Bulk attendance logging transaction with composite validation (`student_id`, `class_id`, `date`, `college_id`).
* **Student Attendance Analytics**:
  * Student dashboard summary card displaying total attendance percentage and subject-wise breakdown.

---

### Phase 5: Security Audit, Cross-Tenant Isolation Testing & Docker Verification
**Objective**: Rigorously test and verify that no cross-tenant leaks are possible and that the 3-container environment is robust.

* **Cross-Tenant Penetration & Leakage Testing**:
  * Test Suite 1: College A Admin attempts to query College B notices and timetable via API with College A token (Must return `403 Forbidden` or `404 Not Found`).
  * Test Suite 2: College A Faculty attempts to record attendance for a student belonging to College B (Must fail RLS check with database error or `403`).
  * Test Suite 3: Direct SQL injection / parameter tampering test on `college_id` in headers or request bodies.
* **Privilege Escalation Testing**:
  * Verify Student tokens are completely rejected on all Faculty attendance mutation endpoints and Admin configuration endpoints.
* **Docker Verification**:
  * Verify cold spin-up via single command: `docker compose up --build`.
  * Validate container restarts retain database state via volume persistence.
  * Validate code hot-reloading works seamlessly inside both `frontend` and `backend` containers on Windows host mounts.
* **Traceability & Scope Audit**:
  * Cross-reference the deployed endpoints and database tables against the PRD to confirm strict adherence with no out-of-scope bloat.

---

## Project Timeline & Milestones

| Milestone | Focus Area | Deliverables | Container Scope | Estimated Duration |
|---|---|---|---|---|
| **Milestone 1** | **Docker Environment & Multi-Tenant Schema** | `docker-compose.yml`, Dockerfiles for 3 containers, PostgreSQL schema with RLS, Alembic setup | `frontend`, `backend`, `database` | Week 1 - 2 |
| **Milestone 2** | **Multi-Tenant Auth & RBAC Middleware** | Tenant resolution middleware, JWT issuance, password security, role guards | `backend`, `database` | Week 3 |
| **Milestone 3** | **Next.js Shell & Multi-Tenant Notices** | Role-based dashboard layouts, Notice CRUD, tenant feed isolation | `frontend`, `backend`, `database` | Week 4 - 5 |
| **Milestone 4** | **Timetable & Scheduling System** | Timetable management UI, weekly schedule view, scheduling conflict engine | `frontend`, `backend`, `database` | Week 6 |
| **Milestone 5** | **Attendance Engine (Faculty & Student)** | Faculty self-check-in, class roster attendance marker, student attendance tracker | `frontend`, `backend`, `database` | Week 7 - 8 |
| **Milestone 6** | **Isolation Audit, Docker Polish & Launch** | Cross-tenant pentest, RLS validation, container performance tuning, documentation | `frontend`, `backend`, `database` | Week 9 - 10 |