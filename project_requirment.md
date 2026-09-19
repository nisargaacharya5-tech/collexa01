COLEXA — REQUIREMENT SHEET

Step 1 — Project Identification

- Project Name: Colexa
- Document: Requirement Sheet
- Purpose: Define the approved system requirements before system design and implementation.
- This document acts as the source of truth for the project requirements.

Step 2 — Requirements

- Identify the actual problems to be solved.
- Define what the system must provide.
- Keep requirements clear, minimal, and measurable.
- Include only requirements supported by the approved source requirements.

Step 3 — Agents

Identify the users/actors who interact with the system:

- Student
- Faculty
- Admin
- System

Step 4 — Actions

Define what each agent can do.

Agent| Actions
Student| View dashboard, timetable, attendance, notices
Faculty| View dashboard, mark own attendance, mark student attendance
Admin| Manage notices and administrative information
System| Authenticate users, process data, apply access rules

Step 5 — Entities

Identify the main data objects required by the requirements:

- User/Account
- Student
- Faculty
- Admin
- Attendance
- Timetable
- Notice

Only entities required by the approved requirements should be included.

Step 6 — Relations

Define how the entities are connected.

- Student → has → Attendance
- Faculty → records → Student Attendance
- Faculty → has → Faculty Attendance
- Timetable → defines → Scheduled Class
- Faculty → teaches → Scheduled Class
- Student → attends → Scheduled Class
- Admin → creates → Notice
- Notice → is visible to → Student / Faculty / Admin
- User → has → Role

Step 7 — Functional Requirements

The system shall:

- Provide role-based access for Student, Faculty, and Admin.
- Provide a dashboard appropriate to each role.
- Allow faculty to record their own attendance.
- Allow faculty to record student attendance according to the timetable.
- Allow students to view their attendance.
- Allow users to view the relevant timetable.
- Allow Admin to create and manage notices.
- Display approved notices to the required users.
- Store and retrieve required information consistently.

Step 8 — Access Control

Feature| Student| Faculty| Admin
Dashboard| View| View| View
Own Attendance| View| Manage| View/Manage
Student Attendance| View Own| Manage| View/Manage
Timetable| View| View| Manage
Notices| View| View| Manage

Access must be restricted according to the user's assigned role.

Step 9 — Data & System Structure

For every requirement, identify:

Requirement → Agent → Action → Entity → Relation

Example:

Requirement: Faculty records student attendance.

Agent: Faculty
Action: Mark attendance
Entities: Faculty, Student, Attendance, Timetable
Relation: Faculty records attendance for a Student according to the Timetable.

This mapping should be completed before database and API design.

Step 10 — Non-Functional Requirements

The system should provide:

- Authentication and authorization.
- Secure access to user data.
- Simple and consistent UI/UX.
- Clear navigation and user flow.
- Reliable data storage and retrieval.
- Maintainable and scalable structure.
- Appropriate input validation.
- Separation of Student, Faculty, and Admin access.
- No unnecessary features beyond the approved scope.

Step 11 — User Flow

Define the basic flow for each agent.

Student:
Login → Dashboard → View Timetable / Attendance / Notices

Faculty:
Login → Dashboard → Faculty Attendance / Timetable → Student Attendance

Admin:
Login → Dashboard → Manage Notices / Administrative Information

The user flow should remain simple and directly connected to the approved requirements.

Step 12 — Traceability

Each requirement must be traceable through the system:

Requirement → Agent → Action → Entity → Relation → System Component

Traceability must ensure that:

- No requirement is missed.
- No unnecessary feature is added.
- Every entity has a valid purpose.
- Every action belongs to an authorized agent.
- Database and API requirements are derived from actual system requirements.

Step 13 — Requirement