"""
Faculty Portal Request and Response Schemas
"""

import uuid
from datetime import date, datetime, time
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, ConfigDict

from app.schemas.admin import NoticeResponse, ScheduledClassResponse, StudentSummary


# --- Faculty Attendance Schemas ---
FacultyAttStatus = Literal["PRESENT", "ABSENT", "ON_LEAVE", "HALF_DAY"]
StudentAttStatus = Literal["PRESENT", "ABSENT", "LATE", "EXCUSED"]


class FacultySelfAttendanceResponse(BaseModel):
    id: uuid.UUID
    college_id: uuid.UUID
    faculty_id: uuid.UUID
    date: date
    status: str
    check_in_time: Optional[time] = None
    check_out_time: Optional[time] = None
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FacultyTeachingClassResponse(BaseModel):
    id: uuid.UUID
    timetable_id: uuid.UUID
    timetable_title: str
    department: str
    semester: str
    section: str
    subject_name: str
    subject_code: str
    day_of_week: str
    start_time: time
    end_time: time
    room_number: str
    enrolled_students_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# --- Faculty Dashboard Schema ---
class FacultyDashboardResponse(BaseModel):
    today_attendance: Optional[FacultySelfAttendanceResponse] = None
    today_classes: List[FacultyTeachingClassResponse] = []
    recent_notices: List[NoticeResponse] = []


# --- Class Roster & Attendance Schemas ---
class EnrolledStudentItem(BaseModel):
    student_id: uuid.UUID
    enrollment_no: str
    full_name: str
    email: str
    department: str
    section: str
    batch_year: str

    model_config = ConfigDict(from_attributes=True)


class ClassRosterResponse(BaseModel):
    scheduled_class_id: uuid.UUID
    subject_name: str
    subject_code: str
    room_number: str
    day_of_week: str
    start_time: time
    end_time: time
    total_enrolled: int
    roster: List[EnrolledStudentItem] = []


class StudentAttendanceMarkItem(BaseModel):
    student_id: uuid.UUID
    status: StudentAttStatus = "PRESENT"
    remarks: Optional[str] = None


class MarkClassAttendanceRequest(BaseModel):
    date: date
    records: List[StudentAttendanceMarkItem] = Field(..., min_length=1)


class UpdateStudentAttendanceItem(BaseModel):
    status: StudentAttStatus
    remarks: Optional[str] = None


class StudentClassAttendanceRecord(BaseModel):
    id: uuid.UUID
    scheduled_class_id: uuid.UUID
    student_id: uuid.UUID
    student_name: str
    enrollment_no: str
    date: date
    status: str
    remarks: Optional[str] = None
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClassAttendanceByDateResponse(BaseModel):
    scheduled_class_id: uuid.UUID
    subject_name: str
    subject_code: str
    date: date
    total_students: int
    present_count: int
    absent_count: int
    attendance_records: List[StudentClassAttendanceRecord] = []
