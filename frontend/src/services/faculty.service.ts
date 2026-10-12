import { apiClient } from '@/lib/api-client';
import {
  ClassAttendanceByDate,
  ClassRoster,
  FacultyDashboard,
  FacultySelfAttendance,
  FacultyTeachingClass,
  MarkClassAttendanceInput,
  Notice,
  StudentClassAttendanceRecord,
} from '@/types';

export const facultyService = {
  // --- Faculty Dashboard ---
  async getDashboard(): Promise<FacultyDashboard> {
    const response = await apiClient.get<FacultyDashboard>('/faculty/dashboard');
    return response.data;
  },

  // --- Self Attendance ---
  async getAttendanceHistory(params?: { start_date?: string; end_date?: string }): Promise<FacultySelfAttendance[]> {
    const response = await apiClient.get<FacultySelfAttendance[]>('/faculty/attendance/me', { params });
    return response.data;
  },

  async checkIn(): Promise<FacultySelfAttendance> {
    const response = await apiClient.post<FacultySelfAttendance>('/faculty/attendance/check-in');
    return response.data;
  },

  async checkOut(): Promise<FacultySelfAttendance> {
    const response = await apiClient.post<FacultySelfAttendance>('/faculty/attendance/check-out');
    return response.data;
  },

  // --- Timetable & Classes ---
  async getTimetable(): Promise<FacultyTeachingClass[]> {
    const response = await apiClient.get<FacultyTeachingClass[]>('/faculty/timetable');
    return response.data;
  },

  async getClassRoster(classId: string): Promise<ClassRoster> {
    const response = await apiClient.get<ClassRoster>(`/faculty/classes/${classId}/roster`);
    return response.data;
  },

  // --- Student Attendance Marking ---
  async getClassAttendanceByDate(classId: string, date: string): Promise<ClassAttendanceByDate> {
    const response = await apiClient.get<ClassAttendanceByDate>(`/faculty/classes/${classId}/attendance`, {
      params: { date },
    });
    return response.data;
  },

  async markClassAttendance(classId: string, payload: MarkClassAttendanceInput): Promise<{ message: string; count: number }> {
    const response = await apiClient.post(`/faculty/classes/${classId}/attendance`, payload);
    return response.data;
  },

  async updateStudentAttendance(
    classId: string,
    attendanceId: string,
    payload: { status: string; remarks?: string }
  ): Promise<StudentClassAttendanceRecord> {
    const response = await apiClient.put<StudentClassAttendanceRecord>(
      `/faculty/classes/${classId}/attendance/${attendanceId}`,
      payload
    );
    return response.data;
  },

  // --- Faculty Notices ---
  async getNotices(): Promise<Notice[]> {
    const response = await apiClient.get<Notice[]>('/faculty/notices');
    return response.data;
  },

  async getNoticeById(id: string): Promise<Notice> {
    const response = await apiClient.get<Notice>(`/faculty/notices/${id}`);
    return response.data;
  },
};
