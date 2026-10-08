"""
Faculty Portal Router (/api/v1/faculty)
Provides faculty endpoints for dashboard, self-attendance (check-in/out),
assigned teaching timetable, class roster, student attendance marking, and notices.
Guarded strictly by require_faculty.
"""

from datetime import date, datetime, time, timezone
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user, require_faculty, get_db
from app.core.exceptions import (
    ResourceNotFoundError,
    ResourceConflictError,
    ForbiddenException,
    BadRequestError,
)
from app.models import (
    College,
    User,
    Faculty,
    Student,
    Timetable,
    ScheduledClass,
    ClassEnrollment,
    FacultyAttendance,
    StudentAttendance,
    Notice,
)
from app.schemas.admin import NoticeResponse
from app.schemas.faculty import (
    FacultyDashboardResponse,
    FacultySelfAttendanceResponse,
    FacultyTeachingClassResponse,
    ClassRosterResponse,
    EnrolledStudentItem,
    MarkClassAttendanceRequest,
    UpdateStudentAttendanceItem,
    ClassAttendanceByDateResponse,
    StudentClassAttendanceRecord,
)
from app.schemas.common import MessageResponse

router = APIRouter(
    prefix="/faculty",
    tags=["Faculty Portal"],
    dependencies=[Depends(require_faculty)],
)

WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]


def get_faculty_profile(current_user: User) -> Faculty:
    if not current_user.faculty_profile:
        raise ForbiddenException("User does not have an active faculty profile.")
    return current_user.faculty_profile


# ==============================================================================
# 1. FACULTY DASHBOARD
# ==============================================================================

@router.get(
    "/dashboard",
    response_model=FacultyDashboardResponse,
    summary="View faculty dashboard",
)
def get_faculty_dashboard(
    current_user: User = Depends(require_faculty),
    db: Session = Depends(get_db),
):
    faculty = get_faculty_profile(current_user)
    college_id = current_user.college_id
    today = date.today()
    day_name = WEEKDAYS[today.weekday()]

    # 1. Today's attendance
    today_attendance = db.scalar(
        select(FacultyAttendance).where(
            FacultyAttendance.college_id == college_id,
            FacultyAttendance.faculty_id == faculty.id,
            FacultyAttendance.date == today,
        )
    )

    # 2. Today's teaching classes
    today_classes_raw = db.scalars(
        select(ScheduledClass)
        .where(
            ScheduledClass.college_id == college_id,
            ScheduledClass.faculty_id == faculty.id,
            ScheduledClass.day_of_week == day_name,
        )
        .options(
            joinedload(ScheduledClass.timetable),
            joinedload(ScheduledClass.enrollments),
        )
        .order_by(ScheduledClass.start_time)
    ).unique().all()

    today_classes = []
    for sc in today_classes_raw:
        today_classes.append(
            FacultyTeachingClassResponse(
                id=sc.id,
                timetable_id=sc.timetable_id,
                timetable_title=sc.timetable.title if sc.timetable else "",
                department=sc.timetable.department if sc.timetable else "",
                semester=sc.timetable.semester if sc.timetable else "",
                section=sc.timetable.section if sc.timetable else "",
                subject_name=sc.subject_name,
                subject_code=sc.subject_code,
                day_of_week=sc.day_of_week,
                start_time=sc.start_time,
                end_time=sc.end_time,
                room_number=sc.room_number,
                enrolled_students_count=len(sc.enrollments) if sc.enrollments else 0,
            )
        )

    # 3. Recent notices targeted to ALL or FACULTY
    recent_notices = db.scalars(
        select(Notice)
        .where(
            Notice.college_id == college_id,
            Notice.is_published == True,
            Notice.target_role.in_(["ALL", "FACULTY"]),
        )
        .options(joinedload(Notice.creator))
        .order_by(Notice.published_at.desc())
        .limit(5)
    ).all()

    return FacultyDashboardResponse(
        today_attendance=FacultySelfAttendanceResponse.model_validate(today_attendance) if today_attendance else None,
        today_classes=today_classes,
        recent_notices=[NoticeResponse.model_validate(n) for n in recent_notices],
    )


# ==============================================================================
# 2. FACULTY SELF-ATTENDANCE
# ==============================================================================

@router.get(
    "/attendance/me",
    response_model=List[FacultySelfAttendanceResponse],
    summary="View own attendance history",
)
def get_own_attendance(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(require_faculty),
    db: Session = Depends(get_db),
):
    faculty = get_faculty_profile(current_user)
    query = (
        select(FacultyAttendance)
        .where(
            FacultyAttendance.college_id == current_user.college_id,
            FacultyAttendance.faculty_id == faculty.id,
        )
        .order_by(FacultyAttendance.date.desc())
    )

    if start_date:
        query = query.where(FacultyAttendance.date >= start_date)
    if end_date:
        query = query.where(FacultyAttendance.date <= end_date)

    records = db.scalars(query).all()
    return records


@router.post(
    "/attendance/check-in",
    response_model=FacultySelfAttendanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Mark own attendance / check in",
)
def check_in(
    current_user: User = Depends(require_faculty),
    db: Session = Depends(get_db),
):
    faculty = get_faculty_profile(current_user)
    college_id = current_user.college_id
    today = date.today()
    now_time = datetime.now().time().replace(microsecond=0)

    # Verify uniqueness for today
    existing = db.scalar(
        select(FacultyAttendance).where(
            FacultyAttendance.college_id == college_id,
            FacultyAttendance.faculty_id == faculty.id,
            FacultyAttendance.date == today,
        )
    )
    if existing:
        raise ResourceConflictError(
            f"Attendance already recorded for today ({today}). Status: {existing.status}."
        )

    attendance = FacultyAttendance(
        college_id=college_id,
        faculty_id=faculty.id,
        date=today,
        status="PRESENT",
        check_in_time=now_time,
        check_out_time=None,
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


@router.post(
    "/attendance/check-out",
    response_model=FacultySelfAttendanceResponse,
    summary="Record check-out time",
)
def check_out(
    current_user: User = Depends(require_faculty),
    db: Session = Depends(get_db),
):
    faculty = get_faculty_profile(current_user)
    college_id = current_user.college_id
    today = date.today()
    now_time = datetime.now().time().replace(microsecond=0)

    attendance = db.scalar(
        select(FacultyAttendance).where(
            FacultyAttendance.college_id == college_id,
            FacultyAttendance.faculty_id == faculty.id,
            FacultyAttendance.date == today,
        )
    )
    if not attendance:
        # If not checked in yet, check-in and check-out at current time
        attendance = FacultyAttendance(
            college_id=college_id,
            faculty_id=faculty.id,
            date=today,
            status="PRESENT",
            check_in_time=now_time,
            check_out_time=now_time,
        )
        db.add(attendance)
    else:
        attendance.check_out_time = now_time

    db.commit()
    db.refresh(attendance)
    return attendance


# ==============================================================================
# 3. FACULTY TIMETABLE & CLASS ROSTER
# ==============================================================================

@router.get(
    "/timetable",
    response_model=List[FacultyTeachingClassResponse],
    summary="View assigned teaching schedule",
)
def get_faculty_timetable(
    current_user: User = Depends(require_faculty),
    db: Session = Depends(get_db),
):
    faculty = get_faculty_profile(current_user)
    college_id = current_user.college_id

    classes = db.scalars(
        select(ScheduledClass)
        .where(
            ScheduledClass.college_id == college_id,
            ScheduledClass.faculty_id == faculty.id,
        )
        .options(
            joinedload(ScheduledClass.timetable),
            joinedload(ScheduledClass.enrollments),
        )
        .order_by(ScheduledClass.day_of_week, ScheduledClass.start_time)
    ).unique().all()

    result = []
    for sc in classes:
        result.append(
            FacultyTeachingClassResponse(
                id=sc.id,
                timetable_id=sc.timetable_id,
                timetable_title=sc.timetable.title if sc.timetable else "",
                department=sc.timetable.department if sc.timetable else "",
                semester=sc.timetable.semester if sc.timetable else "",
                section=sc.timetable.section if sc.timetable else "",
                subject_name=sc.subject_name,
                subject_code=sc.subject_code,
                day_of_week=sc.day_of_week,
                start_time=sc.start_time,
                end_time=sc.end_time,
                room_number=sc.room_number,
                enrolled_students_count=len(sc.enrollments) if sc.enrollments else 0,
            )
        )
    return result


@router.get(
    "/classes/{class_id}/roster",
    response_model=ClassRosterResponse,
    summary="View enrolled students for class",
)
def get_class_roster(
    class_id: uuid.UUID,
    current_user: User = Depends(require_faculty),
    db: Session = Depends(get_db),
):
    faculty = get_faculty_profile(current_user)
    college_id = current_user.college_id

    # Verify class belongs to current faculty
    sc = db.scalar(
        select(ScheduledClass).where(
            ScheduledClass.id == class_id,
            ScheduledClass.college_id == college_id,
            ScheduledClass.faculty_id == faculty.id,
        )
    )
    if not sc:
        raise ResourceNotFoundError("Scheduled class assigned to you", class_id)

    enrollments = db.scalars(
        select(ClassEnrollment)
        .where(
            ClassEnrollment.scheduled_class_id == class_id,
            ClassEnrollment.college_id == college_id,
        )
        .options(joinedload(ClassEnrollment.student).joinedload(Student.user))
    ).all()

    roster_items = []
    for enr in enrollments:
        if enr.student and enr.student.user:
            roster_items.append(
                EnrolledStudentItem(
                    student_id=enr.student.id,
                    enrollment_no=enr.student.enrollment_no,
                    full_name=enr.student.user.full_name,
                    email=enr.student.user.email,
                    department=enr.student.department,
                    section=enr.student.section,
                    batch_year=enr.student.batch_year,
                )
            )

    # Sort alphabetically by full name
    roster_items.sort(key=lambda x: x.full_name)

    return ClassRosterResponse(
        scheduled_class_id=sc.id,
        subject_name=sc.subject_name,
        subject_code=sc.subject_code,
        room_number=sc.room_number,
        day_of_week=sc.day_of_week,
        start_time=sc.start_time,
        end_time=sc.end_time,
        total_enrolled=len(roster_items),
        roster=roster_items,
    )


# ==============================================================================
# 4. CLASS STUDENT ATTENDANCE MARKING
# ==============================================================================

@router.get(
    "/classes/{class_id}/attendance",
    response_model=ClassAttendanceByDateResponse,
    summary="View class attendance by date",
)
def get_class_attendance(
    class_id: uuid.UUID,
    date: Optional[date] = Query(None, description="Date of attendance session (defaults to today)"),
    current_user: User = Depends(require_faculty),
    db: Session = Depends(get_db),
):
    faculty = get_faculty_profile(current_user)
    college_id = current_user.college_id
    query_date = date or date.today()

    sc = db.scalar(
        select(ScheduledClass).where(
            ScheduledClass.id == class_id,
            ScheduledClass.college_id == college_id,
            ScheduledClass.faculty_id == faculty.id,
        )
    )
    if not sc:
        raise ResourceNotFoundError("Scheduled class assigned to you", class_id)

    attendances = db.scalars(
        select(StudentAttendance)
        .where(
            StudentAttendance.scheduled_class_id == class_id,
            StudentAttendance.college_id == college_id,
            StudentAttendance.date == query_date,
        )
        .options(joinedload(StudentAttendance.student).joinedload(Student.user))
        .order_by(StudentAttendance.recorded_at)
    ).all()

    record_items = []
    present_cnt = 0
    absent_cnt = 0

    for att in attendances:
        if att.status == "PRESENT":
            present_cnt += 1
        elif att.status == "ABSENT":
            absent_cnt += 1

        record_items.append(
            StudentClassAttendanceRecord(
                id=att.id,
                scheduled_class_id=att.scheduled_class_id,
                student_id=att.student_id,
                student_name=att.student.user.full_name if att.student and att.student.user else "Unknown",
                enrollment_no=att.student.enrollment_no if att.student else "Unknown",
                date=att.date,
                status=att.status,
                remarks=att.remarks,
                recorded_at=att.recorded_at,
            )
        )

    return ClassAttendanceByDateResponse(
        scheduled_class_id=sc.id,
        subject_name=sc.subject_name,
        subject_code=sc.subject_code,
        date=query_date,
        total_students=len(record_items),
        present_count=present_cnt,
        absent_count=absent_cnt,
        attendance_records=record_items,
    )


@router.post(
    "/classes/{class_id}/attendance",
    response_model=List[StudentClassAttendanceRecord],
    status_code=status.HTTP_201_CREATED,
    summary="Mark student attendance according to timetable",
)
def mark_student_attendance(
    class_id: uuid.UUID,
    payload: MarkClassAttendanceRequest,
    current_user: User = Depends(require_faculty),
    db: Session = Depends(get_db),
):
    faculty = get_faculty_profile(current_user)
    college_id = current_user.college_id

    # Verify class assignment
    sc = db.scalar(
        select(ScheduledClass).where(
            ScheduledClass.id == class_id,
            ScheduledClass.college_id == college_id,
            ScheduledClass.faculty_id == faculty.id,
        )
    )
    if not sc:
        raise ResourceNotFoundError("Scheduled class assigned to you", class_id)

    # Process attendance for each student in the request
    saved_records = []
    for item in payload.records:
        # Check student belongs to college
        student = db.scalar(
            select(Student)
            .where(Student.id == item.student_id, Student.college_id == college_id)
            .options(joinedload(Student.user))
        )
        if not student:
            continue

        # Check existing attendance record for (college_id, class_id, student_id, date)
        existing = db.scalar(
            select(StudentAttendance).where(
                StudentAttendance.college_id == college_id,
                StudentAttendance.scheduled_class_id == class_id,
                StudentAttendance.student_id == item.student_id,
                StudentAttendance.date == payload.date,
            )
        )

        if existing:
            # Update existing
            existing.status = item.status
            existing.remarks = item.remarks
            existing.marked_by_faculty_id = faculty.id
            db_record = existing
        else:
            # Insert new
            db_record = StudentAttendance(
                college_id=college_id,
                scheduled_class_id=class_id,
                student_id=item.student_id,
                marked_by_faculty_id=faculty.id,
                date=payload.date,
                status=item.status,
                remarks=item.remarks,
            )
            db.add(db_record)

        db.flush()
        db.refresh(db_record)

        saved_records.append(
            StudentClassAttendanceRecord(
                id=db_record.id,
                scheduled_class_id=db_record.scheduled_class_id,
                student_id=db_record.student_id,
                student_name=student.user.full_name if student.user else "Unknown",
                enrollment_no=student.enrollment_no,
                date=db_record.date,
                status=db_record.status,
                remarks=db_record.remarks,
                recorded_at=db_record.recorded_at,
            )
        )

    db.commit()
    return saved_records


@router.put(
    "/classes/{class_id}/attendance/{attendance_id}",
    response_model=StudentClassAttendanceRecord,
    summary="Update student attendance record",
)
def update_student_attendance(
    class_id: uuid.UUID,
    attendance_id: uuid.UUID,
    payload: UpdateStudentAttendanceItem,
    current_user: User = Depends(require_faculty),
    db: Session = Depends(get_db),
):
    faculty = get_faculty_profile(current_user)
    college_id = current_user.college_id

    # Verify class assignment
    sc = db.scalar(
        select(ScheduledClass).where(
            ScheduledClass.id == class_id,
            ScheduledClass.college_id == college_id,
            ScheduledClass.faculty_id == faculty.id,
        )
    )
    if not sc:
        raise ResourceNotFoundError("Scheduled class assigned to you", class_id)

    att = db.scalar(
        select(StudentAttendance)
        .where(
            StudentAttendance.id == attendance_id,
            StudentAttendance.scheduled_class_id == class_id,
            StudentAttendance.college_id == college_id,
        )
        .options(joinedload(StudentAttendance.student).joinedload(Student.user))
    )
    if not att:
        raise ResourceNotFoundError("StudentAttendance", attendance_id)

    att.status = payload.status
    if payload.remarks is not None:
        att.remarks = payload.remarks

    db.commit()
    db.refresh(att)

    return StudentClassAttendanceRecord(
        id=att.id,
        scheduled_class_id=att.scheduled_class_id,
        student_id=att.student_id,
        student_name=att.student.user.full_name if att.student and att.student.user else "Unknown",
        enrollment_no=att.student.enrollment_no if att.student else "Unknown",
        date=att.date,
        status=att.status,
        remarks=att.remarks,
        recorded_at=att.recorded_at,
    )


# ==============================================================================
# 5. FACULTY NOTICES
# ==============================================================================

@router.get("/notices", response_model=List[NoticeResponse], summary="View approved notices")
def get_faculty_notices(
    current_user: User = Depends(require_faculty),
    db: Session = Depends(get_db),
):
    notices = db.scalars(
        select(Notice)
        .where(
            Notice.college_id == current_user.college_id,
            Notice.is_published == True,
            Notice.target_role.in_(["ALL", "FACULTY"]),
        )
        .options(joinedload(Notice.creator))
        .order_by(Notice.published_at.desc())
    ).all()
    return notices


@router.get("/notices/{id}", response_model=NoticeResponse, summary="View single notice details")
def get_single_faculty_notice(
    id: uuid.UUID,
    current_user: User = Depends(require_faculty),
    db: Session = Depends(get_db),
):
    notice = db.scalar(
        select(Notice)
        .where(
            Notice.id == id,
            Notice.college_id == current_user.college_id,
            Notice.is_published == True,
            Notice.target_role.in_(["ALL", "FACULTY"]),
        )
        .options(joinedload(Notice.creator))
    )
    if not notice:
        raise ResourceNotFoundError("Notice", id)
    return notice
