import { apiClient } from '@/lib/api-client';
import {
  Notice,
  StudentAttendanceSummary,
  StudentDashboard,
  StudentTimetable,
  SubjectAttendanceDetail,
} from '@/types';

export const studentService = {
  // --- Student Dashboard ---
  async getDashboard(): Promise<StudentDashboard> {
    const response = await apiClient.get<StudentDashboard>('/student/dashboard');
    return response.data;
  },

  // --- Student Timetable ---
  async getTimetable(): Promise<StudentTimetable> {
    const response = await apiClient.get<StudentTimetable>('/student/timetable');
    return response.data;
  },

  // --- Student Attendance ---
  async getAttendanceSummary(): Promise<StudentAttendanceSummary> {
    const response = await apiClient.get<StudentAttendanceSummary>('/student/attendance');
    return response.data;
  },

  async getSubjectAttendance(subjectCode: string): Promise<SubjectAttendanceDetail> {
    const response = await apiClient.get<SubjectAttendanceDetail>(
      `/student/attendance/subjects/${encodeURIComponent(subjectCode)}`
    );
    return response.data;
  },

  // --- Student Notices ---
  async getNotices(): Promise<Notice[]> {
    const response = await apiClient.get<Notice[]>('/student/notices');
    return response.data;
  },

  async getNoticeById(id: string): Promise<Notice> {
    const response = await apiClient.get<Notice>(`/student/notices/${id}`);
    return response.data;
  },
};
