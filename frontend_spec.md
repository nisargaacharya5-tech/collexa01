# Colexa — Frontend Architecture & UI/UX Specification (`frontend_spec.md`)

## 1. Architectural Overview & Design Philosophy

This document defines the comprehensive frontend specification for **Colexa** (Container 1: Next.js 14+ App Router with TypeScript & Tailwind CSS), strictly derived from the [Project Requirements](project_requirment.md), [Database Schema](database_schema.md), and [Strict REST API Specification](api_spec.md).

### 1.1 Core Frontend Principles
1. **Multi-Tenant Context Awareness**: Dynamic tenant identification resolved via subdomain (`{college_code}.colexa.edu`) or local session override, attaching `X-College-ID` to all HTTP requests and adapting institutional logos, names, and theme highlights.
2. **Role-Based Routing Shells**: Strict layout isolation for `/admin/*`, `/faculty/*`, and `/student/*`, backed by Next.js Middleware and RBAC route guards.
3. **Optimistic & Zero-Latency UX**: Instant UI feedback with TanStack Query v5 optimistic mutations, granular skeleton states, and cached prefetching.
4. **Visual Excellence**: Modern aesthetics featuring curated HSL color tokens, dark/light modes, micro-animations, glassmorphism accents, and accessible primitives powered by **shadcn/ui** and **React Bits**.

---

## 2. Design System, Color Palette & Typography

### 2.1 Color Palette & Token System
The Colexa design system utilizes a tailored, modern indigo-slate palette with luminous status accents, built with CSS custom properties (`hsl`) for dark mode interoperability.

```css
:root {
  /* Brand Primary & Accents */
  --primary: 234 89% 64%;           /* #4F46E5 - Electric Indigo */
  --primary-foreground: 0 0% 100%;
  --secondary: 220 14% 96%;         /* Slate 100 */
  --secondary-foreground: 222 47% 11%;
  --accent: 250 95% 76%;            /* Soft Violet Accent */
  --accent-foreground: 222 47% 11%;

  /* Neutral Surface Hierarchy (Light) */
  --background: 210 40% 98%;        /* Ultra Light Slate */
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 234 89% 64%;

  /* Functional Status Accents */
  --success: 142 76% 36%;           /* Emerald (Present / Active) */
  --warning: 38 92% 50%;            /* Amber (Late / Half Day) */
  --destructive: 0 84% 60%;         /* Crimson (Absent / Cancelled) */
  --info: 199 89% 48%;              /* Sky Blue (Excused / Info) */

  --radius: 0.75rem;                /* 12px rounded corners */
}

.dark {
  --background: 224 71% 4%;         /* Deep Slate Black */
  --foreground: 213 31% 91%;
  --card: 224 71% 7%;               /* Elevated Glass Surface */
  --card-foreground: 213 31% 91%;
  --popover: 224 71% 7%;
  --popover-foreground: 213 31% 91%;
  --primary: 234 89% 68%;
  --primary-foreground: 0 0% 100%;
  --secondary: 215 28% 17%;
  --secondary-foreground: 210 40% 98%;
  --muted: 215 28% 17%;
  --muted-foreground: 217 19% 60%;
  --border: 215 28% 18%;
  --input: 215 28% 18%;
  --ring: 234 89% 68%;
}
```

### 2.2 Typography Hierarchy
- **Primary Body & Display**: `Inter` / `Plus Jakarta Sans` via `next/font/google`
- **Monospace (Codes, USNs, Timetable Slots)**: `JetBrains Mono`

---

## 3. UI Components Catalog (`shadcn/ui`)

The UI layer standardizes on `@radix-ui` primitives styled with Tailwind CSS via **shadcn/ui**:

| Component | Usage & Domain Area |
| :--- | :--- |
| `Card`, `CardHeader`, `CardContent` | Metric indicators, timetable period cards, notice feed items |
| `Table`, `TableHeader`, `TableRow`, `TableCell` | Student roster, attendance audit tables, timetable grid |
| `Dialog`, `Sheet` | Add Timetable modal, Class Period creation drawer, Student provisioning modal |
| `DropdownMenu` | Profile dropdown, action menus (Edit/Delete slot, Override attendance) |
| `Select`, `Combobox` (Command + Popover) | Filter department, semester, academic year, target audience |
| `Badge` | Attendance badges (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`), Role badges |
| `Tabs`, `TabsList`, `TabsTrigger` | Day-of-week timetable tabs (Mon-Sat), attendance date selectors |
| `Calendar`, `DatePicker` | Attendance audit date range picker, check-in log navigator |
| `Form`, `FormField`, `Input` (React Hook Form + Zod) | Login forms, notice composition, user provisioning forms |
| `Skeleton` | Content loading states across cards, roster tables, and calendar slots |
| `Toast` / `Sonner` | Real-time notification confirmations, error feedback |

---

## 4. Micro-Animations & Dynamic Visuals (`reactbits.dev`)

To elevate Colexa from a generic administrative tool to a premier, modern portal, we incorporate three curated components inspired by **reactbits.dev**:

### 1. `SpotlightCard` (from `reactbits.dev/components/spotlight-card`)
- **Usage**: Metric Stat Cards on Admin, Faculty, and Student Dashboards.
- **Behavior**: Subtle radial gradient following cursor coordinates on hover, creating an interactive glass illumination effect without visual noise.
- **Integration Target**:
  - Admin KPI cards (Active Students, Timetables, Today's Check-ins)
  - Student Overall Attendance Summary Card (with color glow based on % threshold: Green > 75%, Amber 60-75%, Red < 60%)

### 2. `SplitText` / `BlurText` (from `reactbits.dev/text-animations/split-text`)
- **Usage**: Header greetings upon entering the portal (e.g., *"Welcome back, Prof. Sharma"* or *"Apex Institute Dashboard"*).
- **Behavior**: Smooth staggered blur-to-focus animation on character clusters on initial dashboard mount, reinforcing high polish.

### 3. `AnimatedList` (from `reactbits.dev/components/animated-list`)
- **Usage**: Real-time Notice Board feed and Class Roster attendance checklist.
- **Behavior**: Smooth spring-based enter/exit physics when filtering notices or marking attendance items, giving tactile confirmation to actions.

---

## 5. Screens, Routes & User Flows

```
/
├── /login                               (Tenant selection & JWT authentication)
├── /admin
│   ├── /admin/dashboard                 (Metrics, quick actions, attendance summary)
│   ├── /admin/timetables                (Timetable list, create timetable modal)
│   ├── /admin/timetables/[id]           (Weekly interactive grid, class slot editor, conflict modal)
│   ├── /admin/classes/[id]/roster       (Class student enrollment roster & student add/remove)
│   ├── /admin/notices                   (Notice CRUD, audience targeting & publish toggle)
│   ├── /admin/faculty                   (Faculty directory & account provisioning)
│   ├── /admin/students                  (Student directory & account provisioning)
│   └── /admin/attendance                (Faculty & Student attendance audit and override logs)
├── /faculty
│   ├── /faculty/dashboard               (One-click check-in, today's teaching classes, recent notices)
│   ├── /faculty/attendance              (Historical self check-in/out logs & calendar)
│   ├── /faculty/timetable               (Weekly teaching timetable view with room info)
│   ├── /faculty/classes/[id]/attendance (Interactive roster to mark/update daily attendance)
│   └── /faculty/notices                 (Role-targeted institutional circulars)
└── /student
    ├── /student/dashboard               (Attendance %, today's class schedule, urgent notices)
    ├── /student/timetable               (Weekly class schedule with faculty & room info)
    ├── /student/attendance              (Subject-wise attendance breakdown & percentage meters)
    ├── /student/attendance/[subject]    (Chronological attendance history for specific course)
    └── /student/notices                 (Student & institutional circular feed)
```

---

### 5.1 Admin Portal User Flows

#### Flow A1: Timetable Creation & Period Scheduling with Conflict Prevention
1. **Navigate**: Admin opens `/admin/timetables`.
2. **Create Header**: Clicks `Create Timetable` -> opens `Dialog` -> enters Title (*"CSE 6th Sem 2026"*), Academic Year, Semester (*"6"*), Department (*"Computer Science"*), Section (*"A"*).
3. **Open Weekly Matrix**: Clicks on created timetable card -> routed to `/admin/timetables/[id]`.
4. **Add Class Slot**:
   - Clicks `+ Add Period` on `MONDAY` column.
   - Selects Subject Code (*"CS601"*), Subject Name (*"Compiler Design"*), Faculty (*"Dr. Meera Rao"*), Room (*"Lab 302"*), Start Time (*09:00*), End Time (*10:00*).
   - Backend evaluates faculty & room collision. If conflict occurs, UI presents a clear alert banner highlighting the overlapping schedule.
5. **Manage Roster**:
   - Clicks `Manage Enrolled Students` -> opens `/admin/classes/[id]/roster`.
   - Searches students by enrollment number or bulk enrolls cohort section.

#### Flow A2: Notice Publication & Audience Filtering
1. **Navigate**: Admin clicks `/admin/notices`.
2. **Compose Notice**: Clicks `New Announcement` -> enters Title, Markdown Content, Target Audience (`ALL`, `FACULTY`, `STUDENT`), and Toggle `Publish Immediately`.
3. **Publish & Broadcast**: Submits form -> React Query optimistically adds notice to table and toast confirms publication.

---

### 5.2 Faculty Portal User Flows

#### Flow F1: Daily Check-In & Teaching Schedule
1. **Login & Dashboard**: Faculty logs in -> lands on `/faculty/dashboard`.
2. **One-Click Check-In**:
   - Dashboard prominently displays the **Attendance Widget**.
   - If not checked in: Button displays `Check In Now` -> clicks -> executes `POST /faculty/attendance/check-in` -> timestamp recorded and status badge flips to `PRESENT` (Green).
   - At departure: Clicks `Check Out` -> records check-out time.
3. **Today's Classes**:
   - Dashboard lists today's classes chronologically with room numbers, timings, and a direct button `Take Attendance`.

#### Flow F2: Taking Student Attendance
1. **Open Roster**: Faculty clicks `Take Attendance` for scheduled period -> routed to `/faculty/classes/[class_id]/attendance`.
2. **Default State**: Date defaults to Today; all enrolled students default to `PRESENT`.
3. **Toggle Absent/Late**: Faculty taps single-click buttons for absent or late students (`A` for Red Absent, `L` for Amber Late).
4. **Submit**: Faculty clicks `Submit Attendance` -> sends bulk payload to `POST /faculty/classes/[class_id]/attendance` -> returns success toast and locks submission with an `Edit` toggle.

---

### 5.3 Student Portal User Flows

#### Flow S1: Attendance Tracking & Subject Analytics
1. **Dashboard Overview**: Student logs in -> views **Overall Attendance Card** (e.g., `86.4%` with status ring).
2. **Subject Breakdown**:
   - Student navigates to `/student/attendance`.
   - Views progress bars for each registered subject (e.g., *Operating Systems: 28/30 - 93.3%*, *Database Systems: 18/24 - 75.0%*).
   - Color cues indicate low-attendance alerts (below 75% warning threshold).
3. **Deep Dive**: Clicks *Database Systems* -> routed to `/student/attendance/[subject_code]` -> displays chronological list of all class dates, timestamps, faculty remarks, and status badges.

#### Flow S2: Timetable & Notices
1. **Timetable View**: Student clicks `/student/timetable` -> views Monday-Saturday responsive schedule with assigned faculty and room numbers.
2. **Notices Feed**: Student checks `/student/notices` -> reads published institutional and student circulars.

---

## 6. Technical Integration & Client-Side Caching Strategy

### 6.1 State Management & Data Fetching (TanStack React Query v5)

All server interactions are managed using TanStack Query v5 with strict query key factories and cache invalidation policies:

```typescript
// lib/query-keys.ts
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  admin: {
    stats: ['admin', 'stats'] as const,
    notices: (filters?: object) => ['admin', 'notices', filters] as const,
    timetables: (filters?: object) => ['admin', 'timetables', filters] as const,
    timetableDetail: (id: string) => ['admin', 'timetables', id] as const,
    classRoster: (classId: string) => ['admin', 'classes', classId, 'roster'] as const,
    facultyList: (filters?: object) => ['admin', 'faculty', filters] as const,
    studentList: (filters?: object) => ['admin', 'students', filters] as const,
    facultyAttendance: (filters?: object) => ['admin', 'attendance', 'faculty', filters] as const,
    studentAttendance: (filters?: object) => ['admin', 'attendance', 'students', filters] as const,
  },
  faculty: {
    dashboard: ['faculty', 'dashboard'] as const,
    attendanceMe: (range?: object) => ['faculty', 'attendance', 'me', range] as const,
    timetable: ['faculty', 'timetable'] as const,
    roster: (classId: string) => ['faculty', 'classes', classId, 'roster'] as const,
    classAttendance: (classId: string, date: string) => ['faculty', 'classes', classId, 'attendance', date] as const,
    notices: ['faculty', 'notices'] as const,
  },
  student: {
    dashboard: ['student', 'dashboard'] as const,
    timetable: ['student', 'timetable'] as const,
    attendanceSummary: ['student', 'attendance', 'summary'] as const,
    subjectAttendance: (code: string) => ['student', 'attendance', 'subject', code] as const,
    notices: ['student', 'notices'] as const,
  },
};
```

### 6.2 Caching Invalidation & Stale Time Rules

| Query Domain | `staleTime` | `gcTime` (Cache Time) | Invalidation Trigger Events |
| :--- | :--- | :--- | :--- |
| **Auth Session (`/auth/me`)** | `15 minutes` | `1 hour` | On login, logout, tenant switch |
| **Dashboards (Admin/Fac/Stu)** | `1 minute` | `10 minutes` | Check-in, attendance submission, notice creation |
| **Timetables & Classes** | `5 minutes` | `30 minutes` | Add/Update/Delete class or timetable |
| **Class Rosters** | `5 minutes` | `30 minutes` | Enroll/Remove student from class |
| **Attendance Records** | `30 seconds` | `5 minutes` | Check-in, check-out, mark class attendance, override |
| **Notices Feed** | `2 minutes` | `15 minutes` | Notice publish, update, delete |

---

### 6.3 HTTP Client & Multi-Tenant Interceptor Configuration

```typescript
// lib/api-client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Bearer JWT and Tenant Context
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('colexa_access_token');
    const collegeId = localStorage.getItem('colexa_college_id');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (collegeId) {
      config.headers['X-College-ID'] = collegeId;
    }
  }
  return config;
});

// Response Interceptor: Global 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('colexa_access_token');
      window.location.href = '/login?expired=true';
    }
    return Promise.reject(error);
  }
);
```

---

## 7. Dashboard API Plug-in Integration Mapping

Below is the explicit matrix mapping UI components on each portal dashboard to backend REST endpoints:

### 7.1 Admin Dashboard (`/admin/dashboard`)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Admin Dashboard Header                          │
├──────────────────┬──────────────────┬──────────────────┬───────────────┤
│ Active Students  │  Active Faculty  │ Total Timetables │ Today Check-In│
│  [SpotlightCard] │  [SpotlightCard] │  [SpotlightCard] │[SpotlightCard]│
├──────────────────┴──────────────────┴──────────────────┴───────────────┤
│ Recent Institutional Notices                    Quick Actions          │
│ [AnimatedList] -> Notice Table                 [Create Timetable/User] │
└────────────────────────────────────────────────────────────────────────┘
```

| UI Element / Widget | Hook / React Query Call | Backend REST Endpoint | DB Interaction |
| :--- | :--- | :--- | :--- |
| **Metric KPI Cards** | `useQuery(queryKeys.admin.stats)` | `GET /api/v1/admin/dashboard/stats` | Aggregates counts of users, timetables, and attendances |
| **Recent Notices List** | `useQuery(queryKeys.admin.notices())` | `GET /api/v1/admin/notices?limit=5` | Fetches latest notices created by administrators |
| **Today's Attendance Bar** | `useQuery(queryKeys.admin.facultyAttendance({ date: today }))` | `GET /api/v1/admin/attendance/faculty?date={today}` | Queries today's faculty check-ins |

---

### 7.2 Faculty Dashboard (`/faculty/dashboard`)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Welcome Banner: "Good Morning, Prof. [Name]" [BlurText]               │
├───────────────────────────────────────┬────────────────────────────────┤
│  Daily Self-Attendance Widget         │  Today's Teaching Schedule     │
│  [Check-In / Check-Out Button + Badge]│  [Chronological Period Cards]  │
├───────────────────────────────────────┴────────────────────────────────┤
│  Faculty Circulars & Announcements Feed [AnimatedList]                 │
└────────────────────────────────────────────────────────────────────────┘
```

| UI Element / Widget | Hook / React Query Call | Backend REST Endpoint | DB Interaction |
| :--- | :--- | :--- | :--- |
| **Dashboard Shell** | `useQuery(queryKeys.faculty.dashboard)` | `GET /api/v1/faculty/dashboard` | Fetches today's classes, self check-in status, and notices |
| **Check-In Action** | `useMutation(checkInApi)` | `POST /api/v1/faculty/attendance/check-in` | Inserts `faculty_attendances` record (`status='PRESENT'`) |
| **Check-Out Action**| `useMutation(checkOutApi)` | `POST /api/v1/faculty/attendance/check-out` | Updates `check_out_time` on today's attendance |
| **Take Attendance** | Navigates to `/faculty/classes/{id}/attendance` | `GET /api/v1/faculty/classes/{id}/roster` | Loads roster for attendance marking |

---

### 7.3 Student Dashboard (`/student/dashboard`)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Student Banner: "[Name] • CSE 6th Sem • USN: 1AP21CS042"              │
├───────────────────────────────────────┬────────────────────────────────┤
│  Overall Attendance Percentage        │  Today's Class Schedule        │
│  [SpotlightCard with Circular Gauge]  │  [Timeline Period Cards]       │
├───────────────────────────────────────┴────────────────────────────────┤
│  Student Announcements & Circulars [AnimatedList]                      │
└────────────────────────────────────────────────────────────────────────┘
```

| UI Element / Widget | Hook / React Query Call | Backend REST Endpoint | DB Interaction |
| :--- | :--- | :--- | :--- |
| **Dashboard Shell** | `useQuery(queryKeys.student.dashboard)` | `GET /api/v1/student/dashboard` | Computes attendance %, today's slots, and student notices |
| **Weekly Timetable** | `useQuery(queryKeys.student.timetable)` | `GET /api/v1/student/timetable` | Retrieves cohort schedule joined with faculty info |
| **Subject Breakdown** | `useQuery(queryKeys.student.attendanceSummary)` | `GET /api/v1/student/attendance` | Calculates subject-by-subject attendance percentages |
| **Subject Logs** | `useQuery(queryKeys.student.subjectAttendance(code))` | `GET /api/v1/student/attendance/subjects/{subject_code}` | Chronological attendance records for course |

---

## 8. Summary of Deliverables & Next Steps

1. **Frontend Architecture**: Ready for Next.js 14 App Router initialization in Container 1 (`frontend`).
2. **Component Library**: Tailored with shadcn/ui primitives and reactbits micro-animations.
3. **Plug-and-Play Integration**: TanStack Query v5 cache keys and endpoints align with the deployed FastAPI backend.
