/**
 * Colexa TypeScript Types & Data Transfer Objects
 * Strictly maps to backend Pydantic models in app/schemas/
 */

export type UserRole = 'STUDENT' | 'FACULTY' | 'ADMIN';

export interface College {
  id: string;
  code: string;
  name: string;
  domain?: string | null;
  status: string;
  created_at: string;
}

export interface StudentProfileSummary {
  id: string;
  enrollment_no: string;
  department: string;
  batch_year: string;
  section: string;
}

export interface FacultyProfileSummary {
  id: string;
  employee_id: string;
  department: string;
  designation: string;
}

export interface AdminProfileSummary {
  id: string;
  department?: string | null;
}

export interface UserProfile {
  id: string;
  college_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  college?: College | null;
  student_profile?: StudentProfileSummary | null;
  faculty_profile?: FacultyProfileSummary | null;
  admin_profile?: AdminProfileSummary | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface AuthorMetadata {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export interface Notice {
  id: string;
  college_id: string;
  title: string;
  content: string;
  target_role: 'ALL' | 'FACULTY' | 'STUDENT';
  is_published: boolean;
  published_at: string;
  created_by: string;
  created_at: string;
  creator?: AuthorMetadata | null;
}

export interface NoticeCreateInput {
  title: string;
  content: string;
  target_role: 'ALL' | 'FACULTY' | 'STUDENT';
  is_published: boolean;
  published_at?: string | null;
}

export interface NoticeUpdateInput {
  title?: string;
  content?: string;
  target_role?: 'ALL' | 'FACULTY' | 'STUDENT';
  is_published?: boolean;
  published_at?: string | null;
}

export interface AdminDashboardStats {
  active_students: number;
  active_faculty: number;
  total_timetables: number;
  published_notices: number;
  today_faculty_checkins: number;
  today_student_attendance_marks: number;
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';

export interface FacultySummary {
  id: string;
  employee_id: string;
  department: string;
  designation: string;
  full_name: string;
  email: string;
}

export interface ScheduledClass {
  id: string;
  college_id: string;
  timetable_id: string;
  subject_name: string;
  subject_code: string;
  faculty_id: string;
  day_of_week: DayOfWeek;
  start_time: string; // HH:MM:SS
  end_time: string;   // HH:MM:SS
  room_number: string;
  faculty?: FacultySummary | null;
}

export interface ScheduledClassCreateInput {
  subject_name: string;
  subject_code: string;
  faculty_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  room_number: string;
}

export interface Timetable {
  id: string;
  college_id: string;
  title: string;
  academic_year: string;
  semester: string;
  department: string;
  section: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface TimetableDetail extends Timetable {
  scheduled_classes: ScheduledClass[];
}

export interface TimetableCreateInput {
  title: string;
  academic_year: string;
  semester: string;
  department: string;
  section: string;
  is_active?: boolean;
}

export interface TimetableUpdateInput {
  title?: string;
  academic_year?: string;
  semester?: string;
  department?: string;
  section?: string;
  is_active?: boolean;
}

export interface StudentSummary {
  id: string;
  enrollment_no: string;
  department: string;
  batch_year: string;
  section: string;
  full_name: string;
  email: string;
}

export interface Enrollment {
  id: string;
  college_id: string;
  scheduled_class_id: string;
  student_id: string;
  enrolled_at: string;
  student?: StudentSummary | null;
}

export interface UserSummary {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface FacultyRecord {
  id: string;
  user_id: string;
  college_id: string;
  employee_id: string;
  department: string;
  designation: string;
  user: UserSummary;
}

export interface FacultyCreateInput {
  email: string;
  password: string;
  full_name: string;
  employee_id: string;
  department: string;
  designation: string;
}

export interface StudentRecord {
  id: string;
  user_id: string;
  college_id: string;
  enrollment_no: string;
  department: string;
  batch_year: string;
  section: string;
  user: UserSummary;
}

export interface StudentCreateInput {
  email: string;
  password: string;
  full_name: string;
  enrollment_no: string;
  department: string;
  batch_year: string;
  section: string;
}

export interface FacultyAttendanceAuditRecord {
  id: string;
  college_id: string;
  faculty_id: string;
  faculty_name: string;
  employee_id: string;
  department: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'HALF_DAY';
  check_in_time?: string | null;
  check_out_time?: string | null;
  recorded_at: string;
}

export interface StudentAttendanceAuditRecord {
  id: string;
  college_id: string;
  scheduled_class_id: string;
  subject_name: string;
  subject_code: string;
  student_id: string;
  student_name: string;
  enrollment_no: string;
  department: string;
  marked_by_faculty_id: string;
  faculty_name: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks?: string | null;
  recorded_at: string;
}

// --- Faculty Portal Types ---
export interface FacultySelfAttendance {
  id: string;
  college_id: string;
  faculty_id: string;
  date: string;
  status: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  recorded_at: string;
}

export interface FacultyTeachingClass {
  id: string;
  timetable_id: string;
  timetable_title: string;
  department: string;
  semester: string;
  section: string;
  subject_name: string;
  subject_code: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_number: string;
  enrolled_students_count: number;
}

export interface FacultyDashboard {
  today_attendance?: FacultySelfAttendance | null;
  today_classes: FacultyTeachingClass[];
  recent_notices: Notice[];
}

export interface EnrolledStudentItem {
  student_id: string;
  enrollment_no: string;
  full_name: string;
  email: string;
  department: string;
  section: string;
  batch_year: string;
}

export interface ClassRoster {
  scheduled_class_id: string;
  subject_name: string;
  subject_code: string;
  room_number: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  total_enrolled: number;
  roster: EnrolledStudentItem[];
}

export interface StudentAttendanceMarkItem {
  student_id: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks?: string | null;
}

export interface MarkClassAttendanceInput {
  date: string;
  records: StudentAttendanceMarkItem[];
}

export interface StudentClassAttendanceRecord {
  id: string;
  scheduled_class_id: string;
  student_id: string;
  student_name: string;
  enrollment_no: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks?: string | null;
  recorded_at: string;
}

export interface ClassAttendanceByDate {
  scheduled_class_id: string;
  subject_name: string;
  subject_code: string;
  date: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  attendance_records: StudentClassAttendanceRecord[];
}

// --- Student Portal Types ---
export interface StudentClassSlot {
  id: string;
  timetable_id: string;
  subject_name: string;
  subject_code: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_number: string;
  faculty_name: string;
  faculty_department: string;
}

export interface StudentTimetable {
  student_id: string;
  department: string;
  section: string;
  batch_year: string;
  classes: StudentClassSlot[];
}

export interface SubjectAttendanceSummary {
  subject_name: string;
  subject_code: string;
  total_conducted: number;
  attended_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_percentage: number;
}

export interface StudentAttendanceSummary {
  student_id: string;
  overall_percentage: number;
  total_conducted: number;
  total_attended: number;
  total_absent: number;
  total_late: number;
  total_excused: number;
  subject_breakdown: SubjectAttendanceSummary[];
}

export interface SubjectAttendanceLogItem {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks?: string | null;
  start_time: string;
  end_time: string;
  room_number: string;
  faculty_name: string;
  recorded_at: string;
}

export interface SubjectAttendanceDetail {
  subject_name: string;
  subject_code: string;
  total_conducted: number;
  attended_count: number;
  attendance_percentage: number;
  logs: SubjectAttendanceLogItem[];
}

export interface StudentDashboard {
  overall_attendance_percentage: number;
  total_classes_conducted: number;
  total_classes_attended: number;
  today_classes: StudentClassSlot[];
  recent_notices: Notice[];
}
