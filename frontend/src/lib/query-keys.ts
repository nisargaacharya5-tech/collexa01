/**
 * TanStack React Query Key Factories
 * Derived strictly from frontend_spec.md Section 6.1
 */

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  colleges: {
    list: ['colleges', 'list'] as const,
  },
  admin: {
    stats: ['admin', 'stats'] as const,
    notices: (filters?: Record<string, unknown>) => ['admin', 'notices', filters] as const,
    noticeDetail: (id: string) => ['admin', 'notices', id] as const,
    timetables: (filters?: Record<string, unknown>) => ['admin', 'timetables', filters] as const,
    timetableDetail: (id: string) => ['admin', 'timetables', id] as const,
    classRoster: (classId: string) => ['admin', 'classes', classId, 'roster'] as const,
    facultyList: (filters?: Record<string, unknown>) => ['admin', 'faculty', filters] as const,
    facultyDetail: (id: string) => ['admin', 'faculty', id] as const,
    studentList: (filters?: Record<string, unknown>) => ['admin', 'students', filters] as const,
    studentDetail: (id: string) => ['admin', 'students', id] as const,
    facultyAttendance: (filters?: Record<string, unknown>) => ['admin', 'attendance', 'faculty', filters] as const,
    studentAttendance: (filters?: Record<string, unknown>) => ['admin', 'attendance', 'students', filters] as const,
  },
  faculty: {
    dashboard: ['faculty', 'dashboard'] as const,
    attendanceMe: (range?: Record<string, unknown>) => ['faculty', 'attendance', 'me', range] as const,
    timetable: ['faculty', 'timetable'] as const,
    roster: (classId: string) => ['faculty', 'classes', classId, 'roster'] as const,
    classAttendance: (classId: string, date: string) => ['faculty', 'classes', classId, 'attendance', date] as const,
    notices: ['faculty', 'notices'] as const,
    noticeDetail: (id: string) => ['faculty', 'notices', id] as const,
  },
  student: {
    dashboard: ['student', 'dashboard'] as const,
    timetable: ['student', 'timetable'] as const,
    attendanceSummary: ['student', 'attendance', 'summary'] as const,
    subjectAttendance: (code: string) => ['student', 'attendance', 'subject', code] as const,
    notices: ['student', 'notices'] as const,
    noticeDetail: (id: string) => ['student', 'notices', id] as const,
  },
};
