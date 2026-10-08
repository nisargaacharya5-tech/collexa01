"""
Admin Portal Request and Response Schemas
"""

import uuid
from datetime import date, datetime, time
from typing import List, Literal, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

from app.schemas.common import AuthorMetadata


# --- Admin Dashboard Stats ---
class AdminDashboardStats(BaseModel):
    active_students: int
    active_faculty: int
    total_timetables: int
    published_notices: int
    today_faculty_checkins: int
    today_student_attendance_marks: int


# --- Notices Schemas ---
class NoticeCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=5)
    target_role: Literal["ALL", "FACULTY", "STUDENT"] = "ALL"
    is_published: bool = True
    published_at: Optional[datetime] = None


class NoticeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    content: Optional[str] = Field(None, min_length=5)
    target_role: Optional[Literal["ALL", "FACULTY", "STUDENT"]] = None
    is_published: Optional[bool] = None
    published_at: Optional[datetime] = None


class NoticeResponse(BaseModel):
    id: uuid.UUID
    college_id: uuid.UUID
    title: str
    content: str
    target_role: str
    is_published: bool
    published_at: datetime
    created_by: uuid.UUID
    created_at: datetime
    creator: Optional[AuthorMetadata] = None

    model_config = ConfigDict(from_attributes=True)


# --- Timetable Schemas ---
class TimetableCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    academic_year: str = Field(..., min_length=4, max_length=20)
    semester: str = Field(..., min_length=1, max_length=10)
    department: str = Field(..., min_length=2, max_length=100)
    section: str = Field(..., min_length=1, max_length=10)
    is_active: bool = True


class TimetableUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=150)
    academic_year: Optional[str] = Field(None, min_length=4, max_length=20)
    semester: Optional[str] = Field(None, min_length=1, max_length=10)
    department: Optional[str] = Field(None, min_length=2, max_length=100)
    section: Optional[str] = Field(None, min_length=1, max_length=10)
    is_active: Optional[bool] = None


# --- Scheduled Class Schemas ---
DayOfWeekType = Literal["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]


class ScheduledClassCreate(BaseModel):
    subject_name: str = Field(..., min_length=2, max_length=150)
    subject_code: str = Field(..., min_length=2, max_length=30)
    faculty_id: uuid.UUID
    day_of_week: DayOfWeekType
    start_time: time
    end_time: time
    room_number: str = Field(..., min_length=1, max_length=50)


class ScheduledClassUpdate(BaseModel):
    subject_name: Optional[str] = Field(None, min_length=2, max_length=150)
    subject_code: Optional[str] = Field(None, min_length=2, max_length=30)
    faculty_id: Optional[uuid.UUID] = None
    day_of_week: Optional[DayOfWeekType] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    room_number: Optional[str] = Field(None, min_length=1, max_length=50)


class FacultySummary(BaseModel):
    id: uuid.UUID
    employee_id: str
    department: str
    designation: str
    full_name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class ScheduledClassResponse(BaseModel):
    id: uuid.UUID
    college_id: uuid.UUID
    timetable_id: uuid.UUID
    subject_name: str
    subject_code: str
    faculty_id: uuid.UUID
    day_of_week: str
    start_time: time
    end_time: time
    room_number: str
    faculty: Optional[FacultySummary] = None

    model_config = ConfigDict(from_attributes=True)


class TimetableResponse(BaseModel):
    id: uuid.UUID
    college_id: uuid.UUID
    title: str
    academic_year: str
    semester: str
    department: str
    section: str
    is_active: bool
    created_by: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TimetableDetailResponse(TimetableResponse):
    scheduled_classes: List[ScheduledClassResponse] = []


# --- Class Enrollment Schemas ---
class EnrollmentCreate(BaseModel):
    student_id: uuid.UUID


class StudentSummary(BaseModel):
    id: uuid.UUID
    enrollment_no: str
    department: str
    batch_year: str
    section: str
    full_name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class EnrollmentResponse(BaseModel):
    id: uuid.UUID
    college_id: uuid.UUID
    scheduled_class_id: uuid.UUID
    student_id: uuid.UUID
    enrolled_at: datetime
    student: Optional[StudentSummary] = None

    model_config = ConfigDict(from_attributes=True)


# --- Faculty Management Schemas ---
class FacultyCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=150)
    employee_id: str = Field(..., min_length=1, max_length=60)
    department: str = Field(..., min_length=2, max_length=100)
    designation: str = Field(..., min_length=2, max_length=100)


class FacultyUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    employee_id: Optional[str] = Field(None, min_length=1, max_length=60)
    department: Optional[str] = Field(None, min_length=2, max_length=100)
    designation: Optional[str] = Field(None, min_length=2, max_length=100)
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)


class UserSummary(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FacultyResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    college_id: uuid.UUID
    employee_id: str
    department: str
    designation: str
    user: UserSummary

    model_config = ConfigDict(from_attributes=True)


# --- Student Management Schemas ---
class StudentCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=150)
    enrollment_no: str = Field(..., min_length=1, max_length=60)
    department: str = Field(..., min_length=2, max_length=100)
    batch_year: str = Field(..., min_length=4, max_length=20)
    section: str = Field(..., min_length=1, max_length=10)


class StudentUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    enrollment_no: Optional[str] = Field(None, min_length=1, max_length=60)
    department: Optional[str] = Field(None, min_length=2, max_length=100)
    batch_year: Optional[str] = Field(None, min_length=4, max_length=20)
    section: Optional[str] = Field(None, min_length=1, max_length=10)
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)


class StudentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    college_id: uuid.UUID
    enrollment_no: str
    department: str
    batch_year: str
    section: str
    user: UserSummary

    model_config = ConfigDict(from_attributes=True)


# --- Attendance Audit & Override Schemas ---
FacultyAttStatus = Literal["PRESENT", "ABSENT", "ON_LEAVE", "HALF_DAY"]
StudentAttStatus = Literal["PRESENT", "ABSENT", "LATE", "EXCUSED"]


class FacultyAttendanceAuditResponse(BaseModel):
    id: uuid.UUID
    college_id: uuid.UUID
    faculty_id: uuid.UUID
    faculty_name: str
    employee_id: str
    department: str
    date: date
    status: str
    check_in_time: Optional[time] = None
    check_out_time: Optional[time] = None
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FacultyAttendanceOverrideRequest(BaseModel):
    status: FacultyAttStatus
    check_in_time: Optional[time] = None
    check_out_time: Optional[time] = None


class StudentAttendanceAuditResponse(BaseModel):
    id: uuid.UUID
    college_id: uuid.UUID
    scheduled_class_id: uuid.UUID
    subject_name: str
    subject_code: str
    student_id: uuid.UUID
    student_name: str
    enrollment_no: str
    department: str
    marked_by_faculty_id: uuid.UUID
    faculty_name: str
    date: date
    status: str
    remarks: Optional[str] = None
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentAttendanceOverrideRequest(BaseModel):
    status: StudentAttStatus
    remarks: Optional[str] = None
