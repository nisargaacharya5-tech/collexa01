"""
Student Portal Request and Response Schemas
"""

import uuid
from datetime import date, datetime, time
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from app.schemas.admin import NoticeResponse


# --- Timetable Item Schema ---
class StudentClassSlot(BaseModel):
    id: uuid.UUID
    timetable_id: uuid.UUID
    subject_name: str
    subject_code: str
    day_of_week: str
    start_time: time
    end_time: time
    room_number: str
    faculty_name: str
    faculty_department: str

    model_config = ConfigDict(from_attributes=True)


class StudentTimetableResponse(BaseModel):
    student_id: uuid.UUID
    department: str
    section: str
    batch_year: str
    classes: List[StudentClassSlot] = []


# --- Attendance Summary Schemas ---
class SubjectAttendanceSummary(BaseModel):
    subject_name: str
    subject_code: str
    total_conducted: int
    attended_count: int
    absent_count: int
    late_count: int
    excused_count: int
    attendance_percentage: float


class StudentAttendanceSummaryResponse(BaseModel):
    student_id: uuid.UUID
    overall_percentage: float
    total_conducted: int
    total_attended: int
    total_absent: int
    total_late: int
    total_excused: int
    subject_breakdown: List[SubjectAttendanceSummary] = []


class SubjectAttendanceLogItem(BaseModel):
    id: uuid.UUID
    date: date
    status: str
    remarks: Optional[str] = None
    start_time: time
    end_time: time
    room_number: str
    faculty_name: str
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubjectAttendanceDetailResponse(BaseModel):
    subject_name: str
    subject_code: str
    total_conducted: int
    attended_count: int
    attendance_percentage: float
    logs: List[SubjectAttendanceLogItem] = []


# --- Student Dashboard Schema ---
class StudentDashboardResponse(BaseModel):
    overall_attendance_percentage: float
    total_classes_conducted: int
    total_classes_attended: int
    today_classes: List[StudentClassSlot] = []
    recent_notices: List[NoticeResponse] = []
