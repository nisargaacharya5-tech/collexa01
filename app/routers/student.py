"""
Student Portal Router (/api/v1/student)
Provides student endpoints for personal dashboard, weekly timetable schedule,
attendance analytics (overall & subject-wise), detailed subject logs, and notices.
Guarded strictly by require_student.
"""

from datetime import date, datetime, timezone
from typing import List, Optional, Dict
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user, require_student, get_db
from app.core.exceptions import (
    ResourceNotFoundError,
    ForbiddenException,
)
from app.models import (
    College,
    User,
    Student,
    Faculty,
    Timetable,
    ScheduledClass,
    ClassEnrollment,
    StudentAttendance,
    Notice,
)
from app.schemas.admin import NoticeResponse
from app.schemas.student import (
    StudentDashboardResponse,
    StudentTimetableResponse,
    StudentClassSlot,
    StudentAttendanceSummaryResponse,
    SubjectAttendanceSummary,
    SubjectAttendanceDetailResponse,
    SubjectAttendanceLogItem,
)

router = APIRouter(
    prefix="/student",
    tags=["Student Portal"],
    dependencies=[Depends(require_student)],
)

WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]


def get_student_profile(current_user: User) -> Student:
    if not current_user.student_profile:
        raise ForbiddenException("User does not have an active student profile.")
    return current_user.student_profile


def get_student_scheduled_classes(db: Session, student: Student, college_id: uuid.UUID) -> List[ScheduledClass]:
    """
    Retrieves scheduled classes for student by roster enrollment,
    or by matching cohort timetable (department & section).
    """
    # 1. Enrolled class slots
    enrolled_classes = db.scalars(
        select(ScheduledClass)
        .join(ClassEnrollment, ScheduledClass.id == ClassEnrollment.scheduled_class_id)
        .where(
            ClassEnrollment.student_id == student.id,
            ClassEnrollment.college_id == college_id,
        )
        .options(
            joinedload(ScheduledClass.faculty).joinedload(Faculty.user),
            joinedload(ScheduledClass.timetable),
        )
        .order_by(ScheduledClass.day_of_week, ScheduledClass.start_time)
    ).unique().all()

    if enrolled_classes:
        return list(enrolled_classes)

    # 2. Fallback: cohort-based timetable classes matching department and section
    cohort_classes = db.scalars(
        select(ScheduledClass)
        .join(Timetable, ScheduledClass.timetable_id == Timetable.id)
        .where(
            Timetable.college_id == college_id,
            Timetable.department == student.department,
            Timetable.section == student.section,
            Timetable.is_active == True,
        )
        .options(
            joinedload(ScheduledClass.faculty).joinedload(Faculty.user),
            joinedload(ScheduledClass.timetable),
        )
        .order_by(ScheduledClass.day_of_week, ScheduledClass.start_time)
    ).unique().all()

    return list(cohort_classes)


# ==============================================================================
# 1. STUDENT DASHBOARD
# ==============================================================================

@router.get(
    "/dashboard",
    response_model=StudentDashboardResponse,
    summary="View student dashboard",
)
def get_student_dashboard(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    student = get_student_profile(current_user)
    college_id = current_user.college_id
    today = date.today()
    day_name = WEEKDAYS[today.weekday()]

    # 1. Attendance Metrics
    all_attendance = db.scalars(
        select(StudentAttendance).where(
            StudentAttendance.college_id == college_id,
            StudentAttendance.student_id == student.id,
        )
    ).all()

    total_conducted = len(all_attendance)
    total_attended = sum(1 for a in all_attendance if a.status in ["PRESENT", "LATE", "EXCUSED"])
    overall_percentage = round((total_attended / total_conducted * 100), 2) if total_conducted > 0 else 100.0

    # 2. Today's Classes
    all_classes = get_student_scheduled_classes(db, student, college_id)
    today_classes_raw = [c for c in all_classes if c.day_of_week == day_name]

    today_classes = []
    for c in today_classes_raw:
        faculty_name = c.faculty.user.full_name if c.faculty and c.faculty.user else "Staff"
        faculty_dept = c.faculty.department if c.faculty else c.subject_name
        today_classes.append(
            StudentClassSlot(
                id=c.id,
                timetable_id=c.timetable_id,
                subject_name=c.subject_name,
                subject_code=c.subject_code,
                day_of_week=c.day_of_week,
                start_time=c.start_time,
                end_time=c.end_time,
                room_number=c.room_number,
                faculty_name=faculty_name,
                faculty_department=faculty_dept,
            )
        )

    # 3. Recent notices targeted to ALL or STUDENT
    recent_notices = db.scalars(
        select(Notice)
        .where(
            Notice.college_id == college_id,
            Notice.is_published == True,
            Notice.target_role.in_(["ALL", "STUDENT"]),
        )
        .options(joinedload(Notice.creator))
        .order_by(Notice.published_at.desc())
        .limit(5)
    ).all()

    return StudentDashboardResponse(
        overall_attendance_percentage=overall_percentage,
        total_classes_conducted=total_conducted,
        total_classes_attended=total_attended,
        today_classes=today_classes,
        recent_notices=[NoticeResponse.model_validate(n) for n in recent_notices],
    )


# ==============================================================================
# 2. STUDENT TIMETABLE
# ==============================================================================

@router.get(
    "/timetable",
    response_model=StudentTimetableResponse,
    summary="View student timetable",
)
def get_student_timetable(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    student = get_student_profile(current_user)
    college_id = current_user.college_id

    classes_raw = get_student_scheduled_classes(db, student, college_id)
    class_slots = []
    for c in classes_raw:
        faculty_name = c.faculty.user.full_name if c.faculty and c.faculty.user else "Staff"
        faculty_dept = c.faculty.department if c.faculty else c.subject_name
        class_slots.append(
            StudentClassSlot(
                id=c.id,
                timetable_id=c.timetable_id,
                subject_name=c.subject_name,
                subject_code=c.subject_code,
                day_of_week=c.day_of_week,
                start_time=c.start_time,
                end_time=c.end_time,
                room_number=c.room_number,
                faculty_name=faculty_name,
                faculty_department=faculty_dept,
            )
        )

    return StudentTimetableResponse(
        student_id=student.id,
        department=student.department,
        section=student.section,
        batch_year=student.batch_year,
        classes=class_slots,
    )


# ==============================================================================
# 3. STUDENT ATTENDANCE ANALYTICS
# ==============================================================================

@router.get(
    "/attendance",
    response_model=StudentAttendanceSummaryResponse,
    summary="View student attendance summary & %",
)
def get_student_attendance_summary(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    student = get_student_profile(current_user)
    college_id = current_user.college_id

    # Fetch all attendance records with scheduled class info
    attendances = db.scalars(
        select(StudentAttendance)
        .where(
            StudentAttendance.college_id == college_id,
            StudentAttendance.student_id == student.id,
        )
        .options(joinedload(StudentAttendance.scheduled_class))
        .order_by(StudentAttendance.date.desc())
    ).all()

    total_conducted = len(attendances)
    total_attended = 0
    total_absent = 0
    total_late = 0
    total_excused = 0

    # Aggregate by subject
    subjects_map: Dict[str, Dict] = {}

    for att in attendances:
        sc = att.scheduled_class
        subj_code = sc.subject_code if sc else "GENERAL"
        subj_name = sc.subject_name if sc else "General Subject"

        if subj_code not in subjects_map:
            subjects_map[subj_code] = {
                "subject_name": subj_name,
                "subject_code": subj_code,
                "total": 0,
                "attended": 0,
                "absent": 0,
                "late": 0,
                "excused": 0,
            }

        subjects_map[subj_code]["total"] += 1

        if att.status == "PRESENT":
            total_attended += 1
            subjects_map[subj_code]["attended"] += 1
        elif att.status == "ABSENT":
            total_absent += 1
            subjects_map[subj_code]["absent"] += 1
        elif att.status == "LATE":
            total_attended += 1
            total_late += 1
            subjects_map[subj_code]["attended"] += 1
            subjects_map[subj_code]["late"] += 1
        elif att.status == "EXCUSED":
            total_attended += 1
            total_excused += 1
            subjects_map[subj_code]["attended"] += 1
            subjects_map[subj_code]["excused"] += 1

    overall_pct = round((total_attended / total_conducted * 100), 2) if total_conducted > 0 else 100.0

    subject_breakdown = []
    for s_code, data in subjects_map.items():
        s_total = data["total"]
        s_att = data["attended"]
        s_pct = round((s_att / s_total * 100), 2) if s_total > 0 else 100.0
        subject_breakdown.append(
            SubjectAttendanceSummary(
                subject_name=data["subject_name"],
                subject_code=s_code,
                total_conducted=s_total,
                attended_count=s_att,
                absent_count=data["absent"],
                late_count=data["late"],
                excused_count=data["excused"],
                attendance_percentage=s_pct,
            )
        )

    # Sort breakdown by subject name
    subject_breakdown.sort(key=lambda x: x.subject_name)

    return StudentAttendanceSummaryResponse(
        student_id=student.id,
        overall_percentage=overall_pct,
        total_conducted=total_conducted,
        total_attended=total_attended,
        total_absent=total_absent,
        total_late=total_late,
        total_excused=total_excused,
        subject_breakdown=subject_breakdown,
    )


@router.get(
    "/attendance/subjects/{subject_code}",
    response_model=SubjectAttendanceDetailResponse,
    summary="View detailed subject attendance logs",
)
def get_subject_attendance_details(
    subject_code: str,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    student = get_student_profile(current_user)
    college_id = current_user.college_id

    records = db.scalars(
        select(StudentAttendance)
        .join(ScheduledClass, StudentAttendance.scheduled_class_id == ScheduledClass.id)
        .where(
            StudentAttendance.college_id == college_id,
            StudentAttendance.student_id == student.id,
            ScheduledClass.subject_code == subject_code.strip(),
        )
        .options(
            joinedload(StudentAttendance.scheduled_class),
            joinedload(StudentAttendance.marked_by_faculty).joinedload(Faculty.user),
        )
        .order_by(StudentAttendance.date.desc(), StudentAttendance.recorded_at.desc())
    ).all()

    if not records:
        # Check if subject exists in scheduled classes
        sc = db.scalar(
            select(ScheduledClass).where(
                ScheduledClass.college_id == college_id,
                ScheduledClass.subject_code == subject_code.strip(),
            )
        )
        if not sc:
            raise ResourceNotFoundError("Subject with code", subject_code)

        return SubjectAttendanceDetailResponse(
            subject_name=sc.subject_name,
            subject_code=sc.subject_code,
            total_conducted=0,
            attended_count=0,
            attendance_percentage=100.0,
            logs=[],
        )

    subject_name = records[0].scheduled_class.subject_name
    total_conducted = len(records)
    attended_count = sum(1 for r in records if r.status in ["PRESENT", "LATE", "EXCUSED"])
    pct = round((attended_count / total_conducted * 100), 2) if total_conducted > 0 else 100.0

    logs = []
    for r in records:
        faculty_name = (
            r.marked_by_faculty.user.full_name
            if r.marked_by_faculty and r.marked_by_faculty.user
            else "Staff"
        )
        logs.append(
            SubjectAttendanceLogItem(
                id=r.id,
                date=r.date,
                status=r.status,
                remarks=r.remarks,
                start_time=r.scheduled_class.start_time,
                end_time=r.scheduled_class.end_time,
                room_number=r.scheduled_class.room_number,
                faculty_name=faculty_name,
                recorded_at=r.recorded_at,
            )
        )

    return SubjectAttendanceDetailResponse(
        subject_name=subject_name,
        subject_code=subject_code,
        total_conducted=total_conducted,
        attended_count=attended_count,
        attendance_percentage=pct,
        logs=logs,
    )


# ==============================================================================
# 4. STUDENT NOTICES
# ==============================================================================

@router.get("/notices", response_model=List[NoticeResponse], summary="View approved notices")
def get_student_notices(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    notices = db.scalars(
        select(Notice)
        .where(
            Notice.college_id == current_user.college_id,
            Notice.is_published == True,
            Notice.target_role.in_(["ALL", "STUDENT"]),
        )
        .options(joinedload(Notice.creator))
        .order_by(Notice.published_at.desc())
    ).all()
    return notices


@router.get("/notices/{id}", response_model=NoticeResponse, summary="View single notice details")
def get_single_student_notice(
    id: uuid.UUID,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    notice = db.scalar(
        select(Notice)
        .where(
            Notice.id == id,
            Notice.college_id == current_user.college_id,
            Notice.is_published == True,
            Notice.target_role.in_(["ALL", "STUDENT"]),
        )
        .options(joinedload(Notice.creator))
    )
    if not notice:
        raise ResourceNotFoundError("Notice", id)
    return notice
