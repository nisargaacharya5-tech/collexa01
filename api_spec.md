# Colexa — Strict REST API Specification (`api_spec.md`)

## 1. Architectural Overview & Conventions

This document specifies the complete REST API interface for **Colexa**, strictly mapped from the [Colexa Project Requirement Sheet](file:///c:/Users/nisarga%20bg/OneDrive/Desktop/Collexa/project_requirment.md), [Database Architecture](file:///c:/Users/nisarga%20bg/OneDrive/Desktop/Collexa/database_schema.md), and [SQLAlchemy Models](file:///c:/Users/nisarga%20bg/OneDrive/Desktop/Collexa/models.py).

### 1.1 Multi-Tenant Context & Security Rules
- **Base URL**: `/api/v1`
- **Tenant Isolation**: Every endpoint operates within a tenant context (`college_id`). Tenant identification is resolved via subdomain (`{college_code}.colexa.edu`) or HTTP header `X-College-ID`.
- **Database Row-Level Security (RLS)**: Transactions execute `SET LOCAL app.current_college_id = :college_id` on connection checkout.
- **Authentication**: Bearer JWT tokens contain `sub` (User UUID), `college_id` (Tenant UUID), and `role` (`ADMIN`, `FACULTY`, `STUDENT`).
- **Access Control Enforcement**: RBAC guards enforce exact agent permissions before controller execution.

---

## 2. Authentication & Core Session Routes (Common)

### Common / Auth Routes
| Route | Method | Feature (PRD) | DB Table(s) | DB Action |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | POST | Authenticate user & issue JWT (PRD Step 4, 7, 10) | `users`, `colleges`, `students`, `faculty`, `admins` | **SELECT** user credentials by `(college_id, email, is_active=True)`, verify hashed password, join profile table to assemble token claims |
| `/api/v1/auth/me` | GET | View authenticated profile session (PRD Step 4, 7) | `users`, `colleges`, `students`, `faculty`, `admins` | **SELECT** current user identity, role, and profile details using JWT `sub` and `college_id` |
| `/api/v1/auth/logout` | POST | Invalidate user session (PRD Step 4, 10) | *None* | Stateless JWT invalidation / optional token blacklist |

---

## 3. Admin Portal API Specification

### Admin Routes
| Route | Method | Feature (PRD) | DB Table(s) | DB Action |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/admin/dashboard/stats` | GET | View administrative dashboard metrics (PRD Step 4, 7, 8) | `users`, `students`, `faculty`, `timetables`, `notices`, `faculty_attendances`, `student_attendances` | **SELECT** aggregate metrics: count of active students, faculty, timetables, published notices, and today's attendance summary |
| `/api/v1/admin/notices` | GET | List all notices (PRD Step 4, 7, 8, 11) | `notices`, `users` | **SELECT** all college notices with author metadata, filterable by `target_role` and `is_published` |
| `/api/v1/admin/notices` | POST | Create institutional notice (PRD Step 4, 7, 8, 11) | `notices` | **INSERT** new notice with `college_id`, `title`, `content`, `target_role`, `is_published`, and `created_by` |
| `/api/v1/admin/notices/{id}` | GET | View single notice details (PRD Step 4, 7, 8) | `notices`, `users` | **SELECT** notice details and author metadata matching `id` and `college_id` |
| `/api/v1/admin/notices/{id}` | PUT | Update notice content & target (PRD Step 4, 7, 8, 11) | `notices` | **UPDATE** `title`, `content`, `target_role`, `is_published`, `published_at` for specified notice |
| `/api/v1/admin/notices/{id}` | DELETE | Delete notice (PRD Step 4, 7, 8) | `notices` | **DELETE** notice record matching `id` and `college_id` |
| `/api/v1/admin/timetables` | GET | List timetable headers (PRD Step 4, 7, 8, 11) | `timetables`, `users` | **SELECT** schedule headers filtered by department, semester, academic year, and section |
| `/api/v1/admin/timetables` | POST | Create timetable schedule header (PRD Step 4, 7, 8, 11) | `timetables` | **INSERT** timetable record with `college_id`, `title`, `academic_year`, `semester`, `department`, `section` |
| `/api/v1/admin/timetables/{id}` | GET | View timetable with schedule slots (PRD Step 4, 7, 8) | `timetables`, `scheduled_classes`, `faculty`, `users` | **SELECT** timetable header and all child class period slots with assigned faculty profile |
| `/api/v1/admin/timetables/{id}` | PUT | Update timetable header (PRD Step 4, 7, 8) | `timetables` | **UPDATE** timetable attributes (`title`, `academic_year`, `semester`, `department`, `section`, `is_active`) |
| `/api/v1/admin/timetables/{id}` | DELETE | Delete timetable & cascade slots (PRD Step 4, 7, 8) | `timetables`, `scheduled_classes`, `class_enrollments` | **DELETE** timetable record (cascades to scheduled classes and roster enrollments) |
| `/api/v1/admin/timetables/{id}/classes` | POST | Add scheduled class period slot (PRD Step 4, 7, 8, 11) | `scheduled_classes`, `faculty`, `timetables` | **SELECT** verify faculty/timetable conflict rules, **INSERT** new class period linking faculty, subject, day, time, and room |
| `/api/v1/admin/classes/{class_id}` | PUT | Update class period slot (PRD Step 4, 7, 8) | `scheduled_classes`, `faculty` | **SELECT** check schedule conflicts, **UPDATE** subject, faculty assignment, timing, or room number |
| `/api/v1/admin/classes/{class_id}` | DELETE | Remove scheduled class slot (PRD Step 4, 7, 8) | `scheduled_classes`, `class_enrollments` | **DELETE** class period slot (cascades to class enrollments) |
| `/api/v1/admin/classes/{class_id}/enrollments` | GET | View class roster (PRD Step 4, 7, 11) | `class_enrollments`, `students`, `users` | **SELECT** registered student roster for specified scheduled class slot |
| `/api/v1/admin/classes/{class_id}/enrollments` | POST | Enroll student in class slot (PRD Step 4, 7, 11) | `class_enrollments`, `students`, `scheduled_classes` | **SELECT** verify student and class in tenant, **INSERT** roster mapping into `class_enrollments` |
| `/api/v1/admin/classes/{class_id}/enrollments/{student_id}` | DELETE | Remove student from roster (PRD Step 4, 7, 11) | `class_enrollments` | **DELETE** student enrollment record from scheduled class |
| `/api/v1/admin/faculty` | GET | List faculty directory (PRD Step 4, 11) | `faculty`, `users` | **SELECT** all faculty records joined with base user account credentials and profile details |
| `/api/v1/admin/faculty` | POST | Provision faculty account (PRD Step 4, 11) | `users`, `faculty` | **INSERT** base user (`role='FACULTY'`) and institutional profile in `faculty` |
| `/api/v1/admin/faculty/{id}` | GET | View faculty profile details (PRD Step 4, 11) | `faculty`, `users` | **SELECT** faculty profile, employee ID, department, designation, and user account status |
| `/api/v1/admin/faculty/{id}` | PUT | Update faculty profile info (PRD Step 4, 11) | `faculty`, `users` | **UPDATE** `employee_id`, `department`, `designation` in `faculty` and `full_name`, `is_active` in `users` |
| `/api/v1/admin/students` | GET | List student directory (PRD Step 4, 11) | `students`, `users` | **SELECT** student records filtered by department, batch year, section, or enrollment number |
| `/api/v1/admin/students` | POST | Provision student account (PRD Step 4, 11) | `users`, `students` | **INSERT** base user (`role='STUDENT'`) and academic profile in `students` |
| `/api/v1/admin/students/{id}` | GET | View student profile details (PRD Step 4, 11) | `students`, `users` | **SELECT** student profile, enrollment number, department, cohort batch, and user account status |
| `/api/v1/admin/students/{id}` | PUT | Update student profile info (PRD Step 4, 11) | `students`, `users` | **UPDATE** `enrollment_no`, `department`, `batch_year`, `section` in `students` and `full_name`, `is_active` in `users` |
| `/api/v1/admin/attendance/faculty` | GET | Audit faculty attendance logs (PRD Step 4, 8) | `faculty_attendances`, `faculty`, `users` | **SELECT** institutional faculty check-in/out records with date, department, and status filters |
| `/api/v1/admin/attendance/faculty/{id}` | PUT | Override faculty attendance record (PRD Step 8) | `faculty_attendances` | **UPDATE** faculty attendance `status`, `check_in_time`, or `check_out_time` |
| `/api/v1/admin/attendance/students` | GET | Audit student attendance logs (PRD Step 4, 8) | `student_attendances`, `students`, `users`, `scheduled_classes` | **SELECT** institutional student attendance logs filtered by date range, subject, department, or student |
| `/api/v1/admin/attendance/students/{id}` | PUT | Override student attendance record (PRD Step 8) | `student_attendances` | **UPDATE** student attendance `status` and `remarks` |

---

## 4. Faculty Portal API Specification

### Faculty Routes
| Route | Method | Feature (PRD) | DB Table(s) | DB Action |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/faculty/dashboard` | GET | View faculty dashboard (PRD Step 4, 7, 8, 11) | `faculty`, `scheduled_classes`, `faculty_attendances`, `notices` | **SELECT** today's assigned classes, today's check-in status, and role-relevant notices |
| `/api/v1/faculty/attendance/me` | GET | View own attendance history (PRD Step 4, 7, 8, 11) | `faculty_attendances` | **SELECT** historical daily check-in/out logs and attendance status for current faculty |
| `/api/v1/faculty/attendance/check-in` | POST | Mark own attendance / check in (PRD Step 4, 7, 8, 11) | `faculty_attendances`, `faculty` | **SELECT** verify date uniqueness, **INSERT** daily attendance record (`status='PRESENT'`, `check_in_time=NOW()`) |
| `/api/v1/faculty/attendance/check-out` | POST | Record check-out time (PRD Step 4, 7, 8, 11) | `faculty_attendances`, `faculty` | **UPDATE** set `check_out_time=NOW()` on today's faculty attendance record |
| `/api/v1/faculty/timetable` | GET | View assigned teaching schedule (PRD Step 4, 7, 8, 11) | `scheduled_classes`, `timetables` | **SELECT** scheduled classes assigned to current faculty ordered by `day_of_week` and `start_time` |
| `/api/v1/faculty/classes/{class_id}/roster` | GET | View enrolled students for class (PRD Step 4, 7, 11) | `class_enrollments`, `students`, `users`, `scheduled_classes` | **SELECT** verify faculty assignment, query student roster enrolled in the scheduled class slot |
| `/api/v1/faculty/classes/{class_id}/attendance` | GET | View class attendance by date (PRD Step 4, 7, 8) | `student_attendances`, `students`, `users`, `scheduled_classes` | **SELECT** verify faculty assignment, query attendance logs for given date joined with student info |
| `/api/v1/faculty/classes/{class_id}/attendance` | POST | Mark student attendance according to timetable (PRD Step 4, 7, 8, 11) | `student_attendances`, `class_enrollments`, `scheduled_classes`, `faculty` | **SELECT** verify faculty assignment and roster, **INSERT** bulk student attendance marks (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`) |
| `/api/v1/faculty/classes/{class_id}/attendance/{attendance_id}` | PUT | Update student attendance record (PRD Step 4, 7, 8) | `student_attendances`, `scheduled_classes` | **SELECT** verify class assignment ownership, **UPDATE** `status` and `remarks` |
| `/api/v1/faculty/notices` | GET | View approved notices (PRD Step 4, 7, 8, 11) | `notices` | **SELECT** published notices (`is_published=True`) targeted to `ALL` or `FACULTY` ordered by `published_at DESC` |
| `/api/v1/faculty/notices/{id}` | GET | View single notice details (PRD Step 4, 7, 8) | `notices` | **SELECT** notice details verifying `is_published=True` and target audience |

---

## 5. Student Portal API Specification

### Student Routes
| Route | Method | Feature (PRD) | DB Table(s) | DB Action |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/student/dashboard` | GET | View student dashboard (PRD Step 4, 7, 8, 11) | `students`, `class_enrollments`, `student_attendances`, `notices`, `scheduled_classes` | **SELECT** overall attendance percentage, today's scheduled classes, and latest notices |
| `/api/v1/student/timetable` | GET | View student timetable (PRD Step 4, 7, 8, 11) | `timetables`, `scheduled_classes`, `class_enrollments`, `faculty`, `users`, `students` | **SELECT** weekly scheduled classes by joining enrolled slots or student cohort (`department`, `semester`, `section`) with faculty names |
| `/api/v1/student/attendance` | GET | View student attendance summary & % (PRD Step 4, 7, 8, 11) | `student_attendances`, `scheduled_classes`, `class_enrollments`, `students` | **SELECT** student attendance records, compute overall attendance percentage and subject-wise breakdown |
| `/api/v1/student/attendance/subjects/{subject_code}` | GET | View detailed subject attendance logs (PRD Step 4, 7, 8) | `student_attendances`, `scheduled_classes`, `faculty`, `users` | **SELECT** chronological class session attendance logs for specified subject with status, date, and faculty name |
| `/api/v1/student/notices` | GET | View approved notices (PRD Step 4, 7, 8, 11) | `notices` | **SELECT** published notices (`is_published=True`) targeted to `ALL` or `STUDENT` ordered by `published_at DESC` |
| `/api/v1/student/notices/{id}` | GET | View single notice details (PRD Step 4, 7, 8) | `notices` | **SELECT** notice details verifying `is_published=True` and target audience |

---

## 6. PRD Feature Verification & Traceability Checklist

| PRD Requirement / Feature | PRD Step | Agent / Role | Implemented API Route(s) | Interacting DB Table(s) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **User Authentication & Session Context** | Step 4, 7, 10 | System / All | `POST /api/v1/auth/login`<br>`GET /api/v1/auth/me` | `users`, `colleges`, `students`, `faculty`, `admins` | Verified |
| **Admin Dashboard** | Step 4, 7, 8 | Admin | `GET /api/v1/admin/dashboard/stats` | `users`, `students`, `faculty`, `timetables`, `notices`, `faculty_attendances`, `student_attendances` | Verified |
| **Manage Notices** | Step 4, 7, 8, 11 | Admin | `GET /api/v1/admin/notices`<br>`POST /api/v1/admin/notices`<br>`GET /api/v1/admin/notices/{id}`<br>`PUT /api/v1/admin/notices/{id}`<br>`DELETE /api/v1/admin/notices/{id}` | `notices`, `users` | Verified |
| **Manage Administrative Information** | Step 4, 11 | Admin | `GET /api/v1/admin/faculty`<br>`POST /api/v1/admin/faculty`<br>`GET /api/v1/admin/students`<br>`POST /api/v1/admin/students` | `users`, `faculty`, `students` | Verified |
| **Manage Timetables & Classes** | Step 7, 8 | Admin | `GET /api/v1/admin/timetables`<br>`POST /api/v1/admin/timetables`<br>`POST /api/v1/admin/timetables/{id}/classes`<br>`PUT /api/v1/admin/classes/{class_id}`<br>`DELETE /api/v1/admin/classes/{class_id}` | `timetables`, `scheduled_classes`, `faculty`, `users` | Verified |
| **Manage Class Roster / Enrollments** | Step 6, 7 | Admin | `GET /api/v1/admin/classes/{class_id}/enrollments`<br>`POST /api/v1/admin/classes/{class_id}/enrollments`<br>`DELETE /api/v1/admin/classes/{class_id}/enrollments/{student_id}` | `class_enrollments`, `students`, `scheduled_classes` | Verified |
| **Attendance Administration & Audits** | Step 8 | Admin | `GET /api/v1/admin/attendance/faculty`<br>`PUT /api/v1/admin/attendance/faculty/{id}`<br>`GET /api/v1/admin/attendance/students`<br>`PUT /api/v1/admin/attendance/students/{id}` | `faculty_attendances`, `student_attendances`, `faculty`, `students` | Verified |
| **Faculty Dashboard** | Step 4, 7, 8, 11 | Faculty | `GET /api/v1/faculty/dashboard` | `faculty`, `scheduled_classes`, `faculty_attendances`, `notices` | Verified |
| **Mark Own Attendance (Faculty Check-in)** | Step 4, 7, 8, 11 | Faculty | `GET /api/v1/faculty/attendance/me`<br>`POST /api/v1/faculty/attendance/check-in`<br>`POST /api/v1/faculty/attendance/check-out` | `faculty_attendances`, `faculty` | Verified |
| **View Faculty Timetable** | Step 7, 8, 11 | Faculty | `GET /api/v1/faculty/timetable`<br>`GET /api/v1/faculty/classes/{class_id}/roster` | `scheduled_classes`, `timetables`, `class_enrollments`, `students` | Verified |
| **Mark Student Attendance (by Timetable)** | Step 4, 7, 8, 11 | Faculty | `GET /api/v1/faculty/classes/{class_id}/attendance`<br>`POST /api/v1/faculty/classes/{class_id}/attendance`<br>`PUT /api/v1/faculty/classes/{class_id}/attendance/{attendance_id}` | `student_attendances`, `class_enrollments`, `scheduled_classes`, `faculty` | Verified |
| **View Faculty Notices** | Step 6, 7, 8, 11 | Faculty | `GET /api/v1/faculty/notices`<br>`GET /api/v1/faculty/notices/{id}` | `notices` | Verified |
| **Student Dashboard** | Step 4, 7, 8, 11 | Student | `GET /api/v1/student/dashboard` | `students`, `class_enrollments`, `student_attendances`, `notices`, `scheduled_classes` | Verified |
| **View Student Timetable** | Step 4, 7, 8, 11 | Student | `GET /api/v1/student/timetable` | `timetables`, `scheduled_classes`, `class_enrollments`, `faculty`, `users`, `students` | Verified |
| **View Student Attendance** | Step 4, 7, 8, 11 | Student | `GET /api/v1/student/attendance`<br>`GET /api/v1/student/attendance/subjects/{subject_code}` | `student_attendances`, `scheduled_classes`, `class_enrollments`, `students` | Verified |
| **View Student Notices** | Step 4, 7, 8, 11 | Student | `GET /api/v1/student/notices`<br>`GET /api/v1/student/notices/{id}` | `notices` | Verified |
