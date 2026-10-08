"""
Admin Portal Router (/api/v1/admin)
Provides administrative endpoints for statistics, notices, timetables,
scheduled classes, student roster, faculty/student directory, and attendance audits.
Guarded strictly by require_admin.
"""

from datetime import date, datetime, timezone
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func, and_, or_, delete
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user, require_admin, get_db
from app.core.exceptions import (
    ResourceNotFoundError,
    ResourceConflictError,
    BadRequestError,
)
from app.core.security import hash_password
from app.models import (
    College,
    User,
    Admin,
    Faculty,
    Student,
    Timetable,
    ScheduledClass,
    ClassEnrollment,
    FacultyAttendance,
    StudentAttendance,
    Notice,
)
from app.schemas.admin import (
    AdminDashboardStats,
    NoticeCreate,
    NoticeUpdate,
    NoticeResponse,
    TimetableCreate,
    TimetableUpdate,
    TimetableResponse,
    TimetableDetailResponse,
    ScheduledClassCreate,
    ScheduledClassUpdate,
    ScheduledClassResponse,
    EnrollmentCreate,
    EnrollmentResponse,
    FacultyCreate,
    FacultyUpdate,
    FacultyResponse,
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    FacultyAttendanceAuditResponse,
    FacultyAttendanceOverrideRequest,
    StudentAttendanceAuditResponse,
    StudentAttendanceOverrideRequest,
)
from app.schemas.common import MessageResponse, AuthorMetadata
from app.utils.conflict_checker import check_schedule_conflicts

router = APIRouter(
    prefix="/admin",
    tags=["Admin Portal"],
    dependencies=[Depends(require_admin)],
)


# ==============================================================================
# 1. DASHBOARD STATS
# ==============================================================================

@router.get(
    "/dashboard/stats",
    response_model=AdminDashboardStats,
    summary="View administrative dashboard metrics",
)
def get_dashboard_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id
    today = date.today()

    active_students_count = db.scalar(
        select(func.count(Student.id))
        .join(User, Student.user_id == User.id)
        .where(Student.college_id == college_id, User.is_active == True)
    ) or 0

    active_faculty_count = db.scalar(
        select(func.count(Faculty.id))
        .join(User, Faculty.user_id == User.id)
        .where(Faculty.college_id == college_id, User.is_active == True)
    ) or 0

    total_timetables_count = db.scalar(
        select(func.count(Timetable.id))
        .where(Timetable.college_id == college_id, Timetable.is_active == True)
    ) or 0

    published_notices_count = db.scalar(
        select(func.count(Notice.id))
        .where(Notice.college_id == college_id, Notice.is_published == True)
    ) or 0

    today_faculty_checkins = db.scalar(
        select(func.count(FacultyAttendance.id))
        .where(
            FacultyAttendance.college_id == college_id,
            FacultyAttendance.date == today,
            FacultyAttendance.status == "PRESENT",
        )
    ) or 0

    today_student_attendance_marks = db.scalar(
        select(func.count(StudentAttendance.id))
        .where(
            StudentAttendance.college_id == college_id,
            StudentAttendance.date == today,
        )
    ) or 0

    return AdminDashboardStats(
        active_students=active_students_count,
        active_faculty=active_faculty_count,
        total_timetables=total_timetables_count,
        published_notices=published_notices_count,
        today_faculty_checkins=today_faculty_checkins,
        today_student_attendance_marks=today_student_attendance_marks,
    )


# ==============================================================================
# 2. NOTICES MANAGEMENT
# ==============================================================================

@router.get("/notices", response_model=List[NoticeResponse], summary="List all notices")
def list_notices(
    target_role: Optional[str] = Query(None, description="Filter by target role: ALL, FACULTY, STUDENT"),
    is_published: Optional[bool] = Query(None, description="Filter by publication state"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = (
        select(Notice)
        .where(Notice.college_id == current_user.college_id)
        .options(joinedload(Notice.creator))
        .order_by(Notice.created_at.desc())
    )

    if target_role:
        query = query.where(Notice.target_role == target_role)
    if is_published is not None:
        query = query.where(Notice.is_published == is_published)

    notices = db.scalars(query).all()
    return notices


@router.post(
    "/notices",
    response_model=NoticeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create institutional notice",
)
def create_notice(
    payload: NoticeCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    notice = Notice(
        college_id=current_user.college_id,
        title=payload.title.strip(),
        content=payload.content.strip(),
        target_role=payload.target_role,
        is_published=payload.is_published,
        published_at=payload.published_at or (now if payload.is_published else None),
        created_by=current_user.id,
        created_at=now,
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return notice


@router.get("/notices/{id}", response_model=NoticeResponse, summary="View single notice details")
def get_notice(
    id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    notice = db.scalar(
        select(Notice)
        .where(Notice.id == id, Notice.college_id == current_user.college_id)
        .options(joinedload(Notice.creator))
    )
    if not notice:
        raise ResourceNotFoundError("Notice", id)
    return notice


@router.put("/notices/{id}", response_model=NoticeResponse, summary="Update notice content & target")
def update_notice(
    id: uuid.UUID,
    payload: NoticeUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    notice = db.scalar(
        select(Notice)
        .where(Notice.id == id, Notice.college_id == current_user.college_id)
        .options(joinedload(Notice.creator))
    )
    if not notice:
        raise ResourceNotFoundError("Notice", id)

    if payload.title is not None:
        notice.title = payload.title.strip()
    if payload.content is not None:
        notice.content = payload.content.strip()
    if payload.target_role is not None:
        notice.target_role = payload.target_role
    if payload.is_published is not None:
        notice.is_published = payload.is_published
        if notice.is_published and not notice.published_at:
            notice.published_at = datetime.now(timezone.utc)
    if payload.published_at is not None:
        notice.published_at = payload.published_at

    db.commit()
    db.refresh(notice)
    return notice


@router.delete("/notices/{id}", response_model=MessageResponse, summary="Delete notice")
def delete_notice(
    id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    notice = db.scalar(
        select(Notice).where(Notice.id == id, Notice.college_id == current_user.college_id)
    )
    if not notice:
        raise ResourceNotFoundError("Notice", id)

    db.delete(notice)
    db.commit()
    return MessageResponse(message="Notice deleted successfully.")


# ==============================================================================
# 3. TIMETABLES MANAGEMENT
# ==============================================================================

@router.get("/timetables", response_model=List[TimetableResponse], summary="List timetable headers")
def list_timetables(
    department: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    academic_year: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = (
        select(Timetable)
        .where(Timetable.college_id == current_user.college_id)
        .order_by(Timetable.created_at.desc())
    )

    if department:
        query = query.where(Timetable.department == department)
    if semester:
        query = query.where(Timetable.semester == semester)
    if academic_year:
        query = query.where(Timetable.academic_year == academic_year)
    if section:
        query = query.where(Timetable.section == section)
    if is_active is not None:
        query = query.where(Timetable.is_active == is_active)

    return db.scalars(query).all()


@router.post(
    "/timetables",
    response_model=TimetableResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create timetable schedule header",
)
def create_timetable(
    payload: TimetableCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    timetable = Timetable(
        college_id=current_user.college_id,
        title=payload.title.strip(),
        academic_year=payload.academic_year.strip(),
        semester=payload.semester.strip(),
        department=payload.department.strip(),
        section=payload.section.strip(),
        is_active=payload.is_active,
        created_by=current_user.id,
    )
    db.add(timetable)
    db.commit()
    db.refresh(timetable)
    return timetable


@router.get("/timetables/{id}", response_model=TimetableDetailResponse, summary="View timetable with schedule slots")
def get_timetable(
    id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    timetable = db.scalar(
        select(Timetable)
        .where(Timetable.id == id, Timetable.college_id == current_user.college_id)
        .options(
            joinedload(Timetable.scheduled_classes)
            .joinedload(ScheduledClass.faculty)
            .joinedload(Faculty.user)
        )
    )
    if not timetable:
        raise ResourceNotFoundError("Timetable", id)

    # Transform scheduled classes with faculty summary
    classes_response = []
    for sc in timetable.scheduled_classes:
        faculty_summary = None
        if sc.faculty and sc.faculty.user:
            faculty_summary = {
                "id": sc.faculty.id,
                "employee_id": sc.faculty.employee_id,
                "department": sc.faculty.department,
                "designation": sc.faculty.designation,
                "full_name": sc.faculty.user.full_name,
                "email": sc.faculty.user.email,
            }
        classes_response.append(
            ScheduledClassResponse(
                id=sc.id,
                college_id=sc.college_id,
                timetable_id=sc.timetable_id,
                subject_name=sc.subject_name,
                subject_code=sc.subject_code,
                faculty_id=sc.faculty_id,
                day_of_week=sc.day_of_week,
                start_time=sc.start_time,
                end_time=sc.end_time,
                room_number=sc.room_number,
                faculty=faculty_summary,
            )
        )

    res = TimetableDetailResponse.model_validate(timetable)
    res.scheduled_classes = classes_response
    return res


@router.put("/timetables/{id}", response_model=TimetableResponse, summary="Update timetable header")
def update_timetable(
    id: uuid.UUID,
    payload: TimetableUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    timetable = db.scalar(
        select(Timetable).where(Timetable.id == id, Timetable.college_id == current_user.college_id)
    )
    if not timetable:
        raise ResourceNotFoundError("Timetable", id)

    if payload.title is not None:
        timetable.title = payload.title.strip()
    if payload.academic_year is not None:
        timetable.academic_year = payload.academic_year.strip()
    if payload.semester is not None:
        timetable.semester = payload.semester.strip()
    if payload.department is not None:
        timetable.department = payload.department.strip()
    if payload.section is not None:
        timetable.section = payload.section.strip()
    if payload.is_active is not None:
        timetable.is_active = payload.is_active

    db.commit()
    db.refresh(timetable)
    return timetable


@router.delete("/timetables/{id}", response_model=MessageResponse, summary="Delete timetable & cascade slots")
def delete_timetable(
    id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    timetable = db.scalar(
        select(Timetable).where(Timetable.id == id, Timetable.college_id == current_user.college_id)
    )
    if not timetable:
        raise ResourceNotFoundError("Timetable", id)

    db.delete(timetable)
    db.commit()
    return MessageResponse(message="Timetable and associated scheduled classes deleted successfully.")


# ==============================================================================
# 4. SCHEDULED CLASSES & ROSTER ENROLLMENTS
# ==============================================================================

@router.post(
    "/timetables/{id}/classes",
    response_model=ScheduledClassResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add scheduled class period slot",
)
def add_scheduled_class(
    id: uuid.UUID,
    payload: ScheduledClassCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id

    # Verify timetable
    timetable = db.scalar(
        select(Timetable).where(Timetable.id == id, Timetable.college_id == college_id)
    )
    if not timetable:
        raise ResourceNotFoundError("Timetable", id)

    # Verify faculty in college
    faculty = db.scalar(
        select(Faculty)
        .where(Faculty.id == payload.faculty_id, Faculty.college_id == college_id)
        .options(joinedload(Faculty.user))
    )
    if not faculty:
        raise ResourceNotFoundError("Faculty", payload.faculty_id)

    # Check for schedule and room conflicts
    check_schedule_conflicts(
        db=db,
        college_id=college_id,
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
        faculty_id=payload.faculty_id,
        room_number=payload.room_number.strip(),
    )

    sc = ScheduledClass(
        college_id=college_id,
        timetable_id=timetable.id,
        subject_name=payload.subject_name.strip(),
        subject_code=payload.subject_code.strip(),
        faculty_id=payload.faculty_id,
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room_number=payload.room_number.strip(),
    )
    db.add(sc)
    db.commit()
    db.refresh(sc)

    faculty_summary = {
        "id": faculty.id,
        "employee_id": faculty.employee_id,
        "department": faculty.department,
        "designation": faculty.designation,
        "full_name": faculty.user.full_name,
        "email": faculty.user.email,
    }

    res = ScheduledClassResponse.model_validate(sc)
    res.faculty = faculty_summary
    return res


@router.put("/classes/{class_id}", response_model=ScheduledClassResponse, summary="Update class period slot")
def update_scheduled_class(
    class_id: uuid.UUID,
    payload: ScheduledClassUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id
    sc = db.scalar(
        select(ScheduledClass)
        .where(ScheduledClass.id == class_id, ScheduledClass.college_id == college_id)
        .options(joinedload(ScheduledClass.faculty).joinedload(Faculty.user))
    )
    if not sc:
        raise ResourceNotFoundError("ScheduledClass", class_id)

    target_faculty_id = payload.faculty_id or sc.faculty_id
    target_day = payload.day_of_week or sc.day_of_week
    target_start = payload.start_time or sc.start_time
    target_end = payload.end_time or sc.end_time
    target_room = payload.room_number.strip() if payload.room_number else sc.room_number

    if payload.faculty_id:
        fac = db.scalar(
            select(Faculty).where(Faculty.id == payload.faculty_id, Faculty.college_id == college_id)
        )
        if not fac:
            raise ResourceNotFoundError("Faculty", payload.faculty_id)

    # Check conflicts
    check_schedule_conflicts(
        db=db,
        college_id=college_id,
        day_of_week=target_day,
        start_time=target_start,
        end_time=target_end,
        faculty_id=target_faculty_id,
        room_number=target_room,
        exclude_class_id=sc.id,
    )

    if payload.subject_name is not None:
        sc.subject_name = payload.subject_name.strip()
    if payload.subject_code is not None:
        sc.subject_code = payload.subject_code.strip()
    if payload.faculty_id is not None:
        sc.faculty_id = payload.faculty_id
    if payload.day_of_week is not None:
        sc.day_of_week = payload.day_of_week
    if payload.start_time is not None:
        sc.start_time = payload.start_time
    if payload.end_time is not None:
        sc.end_time = payload.end_time
    if payload.room_number is not None:
        sc.room_number = payload.room_number.strip()

    db.commit()
    db.refresh(sc)

    faculty_summary = None
    if sc.faculty and sc.faculty.user:
        faculty_summary = {
            "id": sc.faculty.id,
            "employee_id": sc.faculty.employee_id,
            "department": sc.faculty.department,
            "designation": sc.faculty.designation,
            "full_name": sc.faculty.user.full_name,
            "email": sc.faculty.user.email,
        }

    res = ScheduledClassResponse.model_validate(sc)
    res.faculty = faculty_summary
    return res


@router.delete("/classes/{class_id}", response_model=MessageResponse, summary="Remove scheduled class slot")
def delete_scheduled_class(
    class_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    sc = db.scalar(
        select(ScheduledClass).where(ScheduledClass.id == class_id, ScheduledClass.college_id == current_user.college_id)
    )
    if not sc:
        raise ResourceNotFoundError("ScheduledClass", class_id)

    db.delete(sc)
    db.commit()
    return MessageResponse(message="Scheduled class slot removed successfully.")


@router.get("/classes/{class_id}/enrollments", response_model=List[EnrollmentResponse], summary="View class roster")
def get_class_enrollments(
    class_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id
    sc = db.scalar(
        select(ScheduledClass).where(ScheduledClass.id == class_id, ScheduledClass.college_id == college_id)
    )
    if not sc:
        raise ResourceNotFoundError("ScheduledClass", class_id)

    enrollments = db.scalars(
        select(ClassEnrollment)
        .where(ClassEnrollment.scheduled_class_id == class_id, ClassEnrollment.college_id == college_id)
        .options(
            joinedload(ClassEnrollment.student).joinedload(Student.user)
        )
    ).all()

    result = []
    for enr in enrollments:
        student_summary = None
        if enr.student and enr.student.user:
            student_summary = {
                "id": enr.student.id,
                "enrollment_no": enr.student.enrollment_no,
                "department": enr.student.department,
                "batch_year": enr.student.batch_year,
                "section": enr.student.section,
                "full_name": enr.student.user.full_name,
                "email": enr.student.user.email,
            }
        result.append(
            EnrollmentResponse(
                id=enr.id,
                college_id=enr.college_id,
                scheduled_class_id=enr.scheduled_class_id,
                student_id=enr.student_id,
                enrolled_at=enr.enrolled_at,
                student=student_summary,
            )
        )
    return result


@router.post(
    "/classes/{class_id}/enrollments",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enroll student in class slot",
)
def enroll_student_in_class(
    class_id: uuid.UUID,
    payload: EnrollmentCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id
    sc = db.scalar(
        select(ScheduledClass).where(ScheduledClass.id == class_id, ScheduledClass.college_id == college_id)
    )
    if not sc:
        raise ResourceNotFoundError("ScheduledClass", class_id)

    student = db.scalar(
        select(Student)
        .where(Student.id == payload.student_id, Student.college_id == college_id)
        .options(joinedload(Student.user))
    )
    if not student:
        raise ResourceNotFoundError("Student", payload.student_id)

    # Check existing enrollment
    existing = db.scalar(
        select(ClassEnrollment).where(
            ClassEnrollment.college_id == college_id,
            ClassEnrollment.scheduled_class_id == class_id,
            ClassEnrollment.student_id == payload.student_id,
        )
    )
    if existing:
        raise ResourceConflictError("Student is already enrolled in this scheduled class slot.")

    enr = ClassEnrollment(
        college_id=college_id,
        scheduled_class_id=class_id,
        student_id=payload.student_id,
    )
    db.add(enr)
    db.commit()
    db.refresh(enr)

    student_summary = {
        "id": student.id,
        "enrollment_no": student.enrollment_no,
        "department": student.department,
        "batch_year": student.batch_year,
        "section": student.section,
        "full_name": student.user.full_name,
        "email": student.user.email,
    }

    res = EnrollmentResponse.model_validate(enr)
    res.student = student_summary
    return res


@router.delete("/classes/{class_id}/enrollments/{student_id}", response_model=MessageResponse, summary="Remove student from roster")
def remove_student_enrollment(
    class_id: uuid.UUID,
    student_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id
    enr = db.scalar(
        select(ClassEnrollment).where(
            ClassEnrollment.college_id == college_id,
            ClassEnrollment.scheduled_class_id == class_id,
            ClassEnrollment.student_id == student_id,
        )
    )
    if not enr:
        raise ResourceNotFoundError("ClassEnrollment for student", student_id)

    db.delete(enr)
    db.commit()
    return MessageResponse(message="Student removed from scheduled class roster.")


# ==============================================================================
# 5. FACULTY MANAGEMENT
# ==============================================================================

@router.get("/faculty", response_model=List[FacultyResponse], summary="List faculty directory")
def list_faculty(
    department: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = (
        select(Faculty)
        .join(User, Faculty.user_id == User.id)
        .where(Faculty.college_id == current_user.college_id)
        .options(joinedload(Faculty.user))
        .order_by(Faculty.department, User.full_name)
    )

    if department:
        query = query.where(Faculty.department == department)
    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                Faculty.employee_id.ilike(s),
                User.full_name.ilike(s),
                User.email.ilike(s),
            )
        )

    return db.scalars(query).all()


@router.post(
    "/faculty",
    response_model=FacultyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Provision faculty account",
)
def create_faculty(
    payload: FacultyCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id
    normalized_email = payload.email.strip().lower()

    # Verify email uniqueness in college
    existing_user = db.scalar(
        select(User).where(User.college_id == college_id, User.email == normalized_email)
    )
    if existing_user:
        raise ResourceConflictError(f"Email '{normalized_email}' is already registered in this college.")

    # Verify employee_id uniqueness in college
    existing_fac = db.scalar(
        select(Faculty).where(
            Faculty.college_id == college_id,
            Faculty.employee_id == payload.employee_id.strip(),
        )
    )
    if existing_fac:
        raise ResourceConflictError(f"Employee ID '{payload.employee_id}' is already assigned.")

    # Create base user
    user = User(
        college_id=college_id,
        email=normalized_email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role="FACULTY",
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Create faculty profile
    faculty = Faculty(
        user_id=user.id,
        college_id=college_id,
        employee_id=payload.employee_id.strip(),
        department=payload.department.strip(),
        designation=payload.designation.strip(),
    )
    db.add(faculty)
    db.commit()

    db.refresh(faculty)
    return faculty


@router.get("/faculty/{id}", response_model=FacultyResponse, summary="View faculty profile details")
def get_faculty(
    id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    faculty = db.scalar(
        select(Faculty)
        .where(Faculty.id == id, Faculty.college_id == current_user.college_id)
        .options(joinedload(Faculty.user))
    )
    if not faculty:
        raise ResourceNotFoundError("Faculty", id)
    return faculty


@router.put("/faculty/{id}", response_model=FacultyResponse, summary="Update faculty profile info")
def update_faculty(
    id: uuid.UUID,
    payload: FacultyUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id
    faculty = db.scalar(
        select(Faculty)
        .where(Faculty.id == id, Faculty.college_id == college_id)
        .options(joinedload(Faculty.user))
    )
    if not faculty:
        raise ResourceNotFoundError("Faculty", id)

    # Check employee_id uniqueness if updated
    if payload.employee_id and payload.employee_id.strip() != faculty.employee_id:
        dup = db.scalar(
            select(Faculty).where(
                Faculty.college_id == college_id,
                Faculty.employee_id == payload.employee_id.strip(),
                Faculty.id != faculty.id,
            )
        )
        if dup:
            raise ResourceConflictError(f"Employee ID '{payload.employee_id}' is already in use.")
        faculty.employee_id = payload.employee_id.strip()

    if payload.department is not None:
        faculty.department = payload.department.strip()
    if payload.designation is not None:
        faculty.designation = payload.designation.strip()

    # Update user attributes
    if payload.full_name is not None:
        faculty.user.full_name = payload.full_name.strip()
    if payload.is_active is not None:
        faculty.user.is_active = payload.is_active
    if payload.password:
        faculty.user.hashed_password = hash_password(payload.password)

    db.commit()
    db.refresh(faculty)
    return faculty


# ==============================================================================
# 6. STUDENT MANAGEMENT
# ==============================================================================

@router.get("/students", response_model=List[StudentResponse], summary="List student directory")
def list_students(
    department: Optional[str] = Query(None),
    batch_year: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    enrollment_no: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = (
        select(Student)
        .join(User, Student.user_id == User.id)
        .where(Student.college_id == current_user.college_id)
        .options(joinedload(Student.user))
        .order_by(Student.department, Student.batch_year, Student.section, Student.enrollment_no)
    )

    if department:
        query = query.where(Student.department == department)
    if batch_year:
        query = query.where(Student.batch_year == batch_year)
    if section:
        query = query.where(Student.section == section)
    if enrollment_no:
        query = query.where(Student.enrollment_no == enrollment_no.strip())
    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                Student.enrollment_no.ilike(s),
                User.full_name.ilike(s),
                User.email.ilike(s),
            )
        )

    return db.scalars(query).all()


@router.post(
    "/students",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Provision student account",
)
def create_student(
    payload: StudentCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id
    normalized_email = payload.email.strip().lower()

    # Check email uniqueness in college
    existing_user = db.scalar(
        select(User).where(User.college_id == college_id, User.email == normalized_email)
    )
    if existing_user:
        raise ResourceConflictError(f"Email '{normalized_email}' is already registered in this college.")

    # Check enrollment_no uniqueness in college
    existing_student = db.scalar(
        select(Student).where(
            Student.college_id == college_id,
            Student.enrollment_no == payload.enrollment_no.strip(),
        )
    )
    if existing_student:
        raise ResourceConflictError(f"Enrollment number '{payload.enrollment_no}' already exists.")

    # Create base user
    user = User(
        college_id=college_id,
        email=normalized_email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role="STUDENT",
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Create student profile
    student = Student(
        user_id=user.id,
        college_id=college_id,
        enrollment_no=payload.enrollment_no.strip(),
        department=payload.department.strip(),
        batch_year=payload.batch_year.strip(),
        section=payload.section.strip(),
    )
    db.add(student)
    db.commit()

    db.refresh(student)
    return student


@router.get("/students/{id}", response_model=StudentResponse, summary="View student profile details")
def get_student(
    id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    student = db.scalar(
        select(Student)
        .where(Student.id == id, Student.college_id == current_user.college_id)
        .options(joinedload(Student.user))
    )
    if not student:
        raise ResourceNotFoundError("Student", id)
    return student


@router.put("/students/{id}", response_model=StudentResponse, summary="Update student profile info")
def update_student(
    id: uuid.UUID,
    payload: StudentUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id
    student = db.scalar(
        select(Student)
        .where(Student.id == id, Student.college_id == college_id)
        .options(joinedload(Student.user))
    )
    if not student:
        raise ResourceNotFoundError("Student", id)

    if payload.enrollment_no and payload.enrollment_no.strip() != student.enrollment_no:
        dup = db.scalar(
            select(Student).where(
                Student.college_id == college_id,
                Student.enrollment_no == payload.enrollment_no.strip(),
                Student.id != student.id,
            )
        )
        if dup:
            raise ResourceConflictError(f"Enrollment number '{payload.enrollment_no}' already exists.")
        student.enrollment_no = payload.enrollment_no.strip()

    if payload.department is not None:
        student.department = payload.department.strip()
    if payload.batch_year is not None:
        student.batch_year = payload.batch_year.strip()
    if payload.section is not None:
        student.section = payload.section.strip()

    if payload.full_name is not None:
        student.user.full_name = payload.full_name.strip()
    if payload.is_active is not None:
        student.user.is_active = payload.is_active
    if payload.password:
        student.user.hashed_password = hash_password(payload.password)

    db.commit()
    db.refresh(student)
    return student


# ==============================================================================
# 7. ATTENDANCE AUDITS & OVERRIDES
# ==============================================================================

@router.get("/attendance/faculty", response_model=List[FacultyAttendanceAuditResponse], summary="Audit faculty attendance logs")
def audit_faculty_attendance(
    date: Optional[date] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    faculty_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = (
        select(FacultyAttendance)
        .join(Faculty, FacultyAttendance.faculty_id == Faculty.id)
        .join(User, Faculty.user_id == User.id)
        .where(FacultyAttendance.college_id == current_user.college_id)
        .options(joinedload(FacultyAttendance.faculty).joinedload(Faculty.user))
        .order_by(FacultyAttendance.date.desc(), FacultyAttendance.recorded_at.desc())
    )

    if date:
        query = query.where(FacultyAttendance.date == date)
    if start_date:
        query = query.where(FacultyAttendance.date >= start_date)
    if end_date:
        query = query.where(FacultyAttendance.date <= end_date)
    if department:
        query = query.where(Faculty.department == department)
    if status:
        query = query.where(FacultyAttendance.status == status)
    if faculty_id:
        query = query.where(FacultyAttendance.faculty_id == faculty_id)

    records = db.scalars(query).all()
    result = []
    for r in records:
        result.append(
            FacultyAttendanceAuditResponse(
                id=r.id,
                college_id=r.college_id,
                faculty_id=r.faculty_id,
                faculty_name=r.faculty.user.full_name if r.faculty and r.faculty.user else "Unknown",
                employee_id=r.faculty.employee_id if r.faculty else "Unknown",
                department=r.faculty.department if r.faculty else "Unknown",
                date=r.date,
                status=r.status,
                check_in_time=r.check_in_time,
                check_out_time=r.check_out_time,
                recorded_at=r.recorded_at,
            )
        )
    return result


@router.put("/attendance/faculty/{id}", response_model=FacultyAttendanceAuditResponse, summary="Override faculty attendance record")
def override_faculty_attendance(
    id: uuid.UUID,
    payload: FacultyAttendanceOverrideRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id
    record = db.scalar(
        select(FacultyAttendance)
        .where(FacultyAttendance.id == id, FacultyAttendance.college_id == college_id)
        .options(joinedload(FacultyAttendance.faculty).joinedload(Faculty.user))
    )
    if not record:
        raise ResourceNotFoundError("FacultyAttendance", id)

    record.status = payload.status
    if payload.check_in_time is not None:
        record.check_in_time = payload.check_in_time
    if payload.check_out_time is not None:
        record.check_out_time = payload.check_out_time

    db.commit()
    db.refresh(record)

    return FacultyAttendanceAuditResponse(
        id=record.id,
        college_id=record.college_id,
        faculty_id=record.faculty_id,
        faculty_name=record.faculty.user.full_name if record.faculty and record.faculty.user else "Unknown",
        employee_id=record.faculty.employee_id if record.faculty else "Unknown",
        department=record.faculty.department if record.faculty else "Unknown",
        date=record.date,
        status=record.status,
        check_in_time=record.check_in_time,
        check_out_time=record.check_out_time,
        recorded_at=record.recorded_at,
    )


@router.get("/attendance/students", response_model=List[StudentAttendanceAuditResponse], summary="Audit student attendance logs")
def audit_student_attendance(
    date: Optional[date] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    scheduled_class_id: Optional[uuid.UUID] = Query(None),
    department: Optional[str] = Query(None),
    student_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = (
        select(StudentAttendance)
        .join(Student, StudentAttendance.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .join(ScheduledClass, StudentAttendance.scheduled_class_id == ScheduledClass.id)
        .join(Faculty, StudentAttendance.marked_by_faculty_id == Faculty.id)
        .where(StudentAttendance.college_id == current_user.college_id)
        .options(
            joinedload(StudentAttendance.student).joinedload(Student.user),
            joinedload(StudentAttendance.scheduled_class),
            joinedload(StudentAttendance.marked_by_faculty).joinedload(Faculty.user),
        )
        .order_by(StudentAttendance.date.desc(), StudentAttendance.recorded_at.desc())
    )

    if date:
        query = query.where(StudentAttendance.date == date)
    if start_date:
        query = query.where(StudentAttendance.date >= start_date)
    if end_date:
        query = query.where(StudentAttendance.date <= end_date)
    if scheduled_class_id:
        query = query.where(StudentAttendance.scheduled_class_id == scheduled_class_id)
    if department:
        query = query.where(Student.department == department)
    if student_id:
        query = query.where(StudentAttendance.student_id == student_id)
    if status:
        query = query.where(StudentAttendance.status == status)

    records = db.scalars(query).all()
    result = []
    for r in records:
        result.append(
            StudentAttendanceAuditResponse(
                id=r.id,
                college_id=r.college_id,
                scheduled_class_id=r.scheduled_class_id,
                subject_name=r.scheduled_class.subject_name if r.scheduled_class else "Unknown",
                subject_code=r.scheduled_class.subject_code if r.scheduled_class else "Unknown",
                student_id=r.student_id,
                student_name=r.student.user.full_name if r.student and r.student.user else "Unknown",
                enrollment_no=r.student.enrollment_no if r.student else "Unknown",
                department=r.student.department if r.student else "Unknown",
                marked_by_faculty_id=r.marked_by_faculty_id,
                faculty_name=r.marked_by_faculty.user.full_name if r.marked_by_faculty and r.marked_by_faculty.user else "Unknown",
                date=r.date,
                status=r.status,
                remarks=r.remarks,
                recorded_at=r.recorded_at,
            )
        )
    return result


@router.put("/attendance/students/{id}", response_model=StudentAttendanceAuditResponse, summary="Override student attendance record")
def override_student_attendance(
    id: uuid.UUID,
    payload: StudentAttendanceOverrideRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id
    record = db.scalar(
        select(StudentAttendance)
        .where(StudentAttendance.id == id, StudentAttendance.college_id == college_id)
        .options(
            joinedload(StudentAttendance.student).joinedload(Student.user),
            joinedload(StudentAttendance.scheduled_class),
            joinedload(StudentAttendance.marked_by_faculty).joinedload(Faculty.user),
        )
    )
    if not record:
        raise ResourceNotFoundError("StudentAttendance", id)

    record.status = payload.status
    if payload.remarks is not None:
        record.remarks = payload.remarks

    db.commit()
    db.refresh(record)

    return StudentAttendanceAuditResponse(
        id=record.id,
        college_id=record.college_id,
        scheduled_class_id=record.scheduled_class_id,
        subject_name=record.scheduled_class.subject_name if record.scheduled_class else "Unknown",
        subject_code=record.scheduled_class.subject_code if record.scheduled_class else "Unknown",
        student_id=record.student_id,
        student_name=record.student.user.full_name if record.student and record.student.user else "Unknown",
        enrollment_no=record.student.enrollment_no if record.student else "Unknown",
        department=record.student.department if record.student else "Unknown",
        marked_by_faculty_id=record.marked_by_faculty_id,
        faculty_name=record.marked_by_faculty.user.full_name if record.marked_by_faculty and record.marked_by_faculty.user else "Unknown",
        date=record.date,
        status=record.status,
        remarks=record.remarks,
        recorded_at=record.recorded_at,
    )
