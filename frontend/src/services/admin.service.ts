import { apiClient } from '@/lib/api-client';
import {
  AdminDashboardStats,
  Enrollment,
  FacultyAttendanceAuditRecord,
  FacultyCreateInput,
  FacultyRecord,
  Notice,
  NoticeCreateInput,
  NoticeUpdateInput,
  ScheduledClass,
  ScheduledClassCreateInput,
  StudentAttendanceAuditRecord,
  StudentCreateInput,
  StudentRecord,
  Timetable,
  TimetableCreateInput,
  TimetableDetail,
  TimetableUpdateInput,
} from '@/types';

export const adminService = {
  // --- Dashboard Stats ---
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const response = await apiClient.get<AdminDashboardStats>('/admin/dashboard/stats');
    return response.data;
  },

  // --- Notices ---
  async getNotices(params?: { target_role?: string; is_published?: boolean }): Promise<Notice[]> {
    const response = await apiClient.get<Notice[]>('/admin/notices', { params });
    return response.data;
  },

  async createNotice(payload: NoticeCreateInput): Promise<Notice> {
    const response = await apiClient.post<Notice>('/admin/notices', payload);
    return response.data;
  },

  async getNoticeById(id: string): Promise<Notice> {
    const response = await apiClient.get<Notice>(`/admin/notices/${id}`);
    return response.data;
  },

  async updateNotice(id: string, payload: NoticeUpdateInput): Promise<Notice> {
    const response = await apiClient.put<Notice>(`/admin/notices/${id}`, payload);
    return response.data;
  },

  async deleteNotice(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/admin/notices/${id}`);
    return response.data;
  },

  // --- Timetables ---
  async getTimetables(params?: { department?: string; semester?: string }): Promise<Timetable[]> {
    const response = await apiClient.get<Timetable[]>('/admin/timetables', { params });
    return response.data;
  },

  async createTimetable(payload: TimetableCreateInput): Promise<Timetable> {
    const response = await apiClient.post<Timetable>('/admin/timetables', payload);
    return response.data;
  },

  async getTimetableById(id: string): Promise<TimetableDetail> {
    const response = await apiClient.get<TimetableDetail>(`/admin/timetables/${id}`);
    return response.data;
  },

  async updateTimetable(id: string, payload: TimetableUpdateInput): Promise<Timetable> {
    const response = await apiClient.put<Timetable>(`/admin/timetables/${id}`, payload);
    return response.data;
  },

  async deleteTimetable(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/admin/timetables/${id}`);
    return response.data;
  },

  // --- Scheduled Classes ---
  async addClassSlot(timetableId: string, payload: ScheduledClassCreateInput): Promise<ScheduledClass> {
    const response = await apiClient.post<ScheduledClass>(`/admin/timetables/${timetableId}/classes`, payload);
    return response.data;
  },

  async updateClassSlot(classId: string, payload: Partial<ScheduledClassCreateInput>): Promise<ScheduledClass> {
    const response = await apiClient.put<ScheduledClass>(`/admin/classes/${classId}`, payload);
    return response.data;
  },

  async deleteClassSlot(classId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/admin/classes/${classId}`);
    return response.data;
  },

  // --- Class Enrollments & Roster ---
  async getClassRoster(classId: string): Promise<Enrollment[]> {
    const response = await apiClient.get<Enrollment[]>(`/admin/classes/${classId}/enrollments`);
    return response.data;
  },

  async enrollStudent(classId: string, studentId: string): Promise<Enrollment> {
    const response = await apiClient.post<Enrollment>(`/admin/classes/${classId}/enrollments`, {
      student_id: studentId,
    });
    return response.data;
  },

  async removeStudentFromRoster(classId: string, studentId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/admin/classes/${classId}/enrollments/${studentId}`);
    return response.data;
  },

  // --- Faculty Directory ---
  async getFacultyList(params?: { department?: string }): Promise<FacultyRecord[]> {
    const response = await apiClient.get<FacultyRecord[]>('/admin/faculty', { params });
    return response.data;
  },

  async createFaculty(payload: FacultyCreateInput): Promise<FacultyRecord> {
    const response = await apiClient.post<FacultyRecord>('/admin/faculty', payload);
    return response.data;
  },

  async getFacultyById(id: string): Promise<FacultyRecord> {
    const response = await apiClient.get<FacultyRecord>(`/admin/faculty/${id}`);
    return response.data;
  },

  // --- Students Directory ---
  async getStudentList(params?: { department?: string; batch_year?: string; section?: string }): Promise<StudentRecord[]> {
    const response = await apiClient.get<StudentRecord[]>('/admin/students', { params });
    return response.data;
  },

  async createStudent(payload: StudentCreateInput): Promise<StudentRecord> {
    const response = await apiClient.post<StudentRecord>('/admin/students', payload);
    return response.data;
  },

  async getStudentById(id: string): Promise<StudentRecord> {
    const response = await apiClient.get<StudentRecord>(`/admin/students/${id}`);
    return response.data;
  },

  // --- Attendance Audits & Overrides ---
  async getFacultyAttendanceAudit(params?: { date?: string; department?: string; status?: string }): Promise<FacultyAttendanceAuditRecord[]> {
    const response = await apiClient.get<FacultyAttendanceAuditRecord[]>('/admin/attendance/faculty', { params });
    return response.data;
  },

  async overrideFacultyAttendance(id: string, payload: { status: string; check_in_time?: string; check_out_time?: string }): Promise<FacultyAttendanceAuditRecord> {
    const response = await apiClient.put<FacultyAttendanceAuditRecord>(`/admin/attendance/faculty/${id}`, payload);
    return response.data;
  },

  async getStudentAttendanceAudit(params?: { date?: string; department?: string; status?: string; student_id?: string }): Promise<StudentAttendanceAuditRecord[]> {
    const response = await apiClient.get<StudentAttendanceAuditRecord[]>('/admin/attendance/students', { params });
    return response.data;
  },

  async overrideStudentAttendance(id: string, payload: { status: string; remarks?: string }): Promise<StudentAttendanceAuditRecord> {
    const response = await apiClient.put<StudentAttendanceAuditRecord>(`/admin/attendance/students/${id}`, payload);
    return response.data;
  },
};
