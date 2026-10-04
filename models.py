"""
Colexa Database Models
SQLAlchemy 2.0+ Declarative Models adhering strictly to database_schema.md
Multi-Tenant Architecture with Tenant Root Entity (colleges) and Tenant Anchors.
"""

import uuid
from datetime import datetime, date, time, timezone
from typing import Optional, List

from sqlalchemy import (
    String,
    Boolean,
    DateTime,
    Date as SQLDate,
    Time as SQLTime,
    Text,
    ForeignKey,
    UniqueConstraint,
    Index,
    CheckConstraint,
    func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class College(Base):
    """
    Tenant Root Entity: Stores institution registrations and tenant root metadata.
    """
    __tablename__ = "colleges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="college", cascade="all, delete-orphan")
    students: Mapped[List["Student"]] = relationship("Student", back_populates="college", cascade="all, delete-orphan")
    faculty: Mapped[List["Faculty"]] = relationship("Faculty", back_populates="college", cascade="all, delete-orphan")
    admins: Mapped[List["Admin"]] = relationship("Admin", back_populates="college", cascade="all, delete-orphan")
    timetables: Mapped[List["Timetable"]] = relationship("Timetable", back_populates="college", cascade="all, delete-orphan")
    scheduled_classes: Mapped[List["ScheduledClass"]] = relationship("ScheduledClass", back_populates="college", cascade="all, delete-orphan")
    class_enrollments: Mapped[List["ClassEnrollment"]] = relationship("ClassEnrollment", back_populates="college", cascade="all, delete-orphan")
    student_attendances: Mapped[List["StudentAttendance"]] = relationship("StudentAttendance", back_populates="college", cascade="all, delete-orphan")
    faculty_attendances: Mapped[List["FacultyAttendance"]] = relationship("FacultyAttendance", back_populates="college", cascade="all, delete-orphan")
    notices: Mapped[List["Notice"]] = relationship("Notice", back_populates="college", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<College(code='{self.code}', name='{self.name}')>"


class User(Base):
    """
    Core Identity & Access: Unified login credentials partitioned per college.
    """
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    college_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("colleges.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        CheckConstraint("role IN ('STUDENT', 'FACULTY', 'ADMIN')", name="check_user_role"),
        UniqueConstraint("college_id", "email", name="uq_users_college_email"),
        Index("idx_users_tenant_role", "college_id", "role", "is_active"),
    )

    # Relationships
    college: Mapped["College"] = relationship("College", back_populates="users")
    student_profile: Mapped[Optional["Student"]] = relationship(
        "Student", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    faculty_profile: Mapped[Optional["Faculty"]] = relationship(
        "Faculty", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    admin_profile: Mapped[Optional["Admin"]] = relationship(
        "Admin", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    created_timetables: Mapped[List["Timetable"]] = relationship(
        "Timetable", back_populates="creator", foreign_keys="Timetable.created_by"
    )
    created_notices: Mapped[List["Notice"]] = relationship(
        "Notice", back_populates="creator", foreign_keys="Notice.created_by"
    )

    def __repr__(self) -> str:
        return f"<User(email='{self.email}', role='{self.role}', college_id='{self.college_id}')>"


class Student(Base):
    """
    Student Profile Extension: Academic details extending the base user entity.
    """
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )
    college_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("colleges.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    enrollment_no: Mapped[str] = mapped_column(String(60), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    batch_year: Mapped[str] = mapped_column(String(20), nullable=False)
    section: Mapped[str] = mapped_column(String(10), nullable=False)

    __table_args__ = (
        UniqueConstraint("college_id", "enrollment_no", name="uq_students_college_enrollment"),
        Index("idx_students_cohort", "college_id", "department", "batch_year", "section"),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="student_profile")
    college: Mapped["College"] = relationship("College", back_populates="students")
    enrollments: Mapped[List["ClassEnrollment"]] = relationship(
        "ClassEnrollment", back_populates="student", cascade="all, delete-orphan"
    )
    attendances: Mapped[List["StudentAttendance"]] = relationship(
        "StudentAttendance", back_populates="student", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Student(enrollment_no='{self.enrollment_no}', dept='{self.department}')>"


class Faculty(Base):
    """
    Faculty Profile Extension: Institutional details extending the base user entity.
    """
    __tablename__ = "faculty"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )
    college_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("colleges.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    employee_id: Mapped[str] = mapped_column(String(60), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    designation: Mapped[str] = mapped_column(String(100), nullable=False)

    __table_args__ = (
        UniqueConstraint("college_id", "employee_id", name="uq_faculty_college_employee"),
        Index("idx_faculty_tenant_dept", "college_id", "department"),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="faculty_profile")
    college: Mapped["College"] = relationship("College", back_populates="faculty")
    scheduled_classes: Mapped[List["ScheduledClass"]] = relationship(
        "ScheduledClass", back_populates="faculty"
    )
    marked_attendances: Mapped[List["StudentAttendance"]] = relationship(
        "StudentAttendance", back_populates="marked_by_faculty", foreign_keys="StudentAttendance.marked_by_faculty_id"
    )
    attendances: Mapped[List["FacultyAttendance"]] = relationship(
        "FacultyAttendance", back_populates="faculty", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Faculty(employee_id='{self.employee_id}', dept='{self.department}', designation='{self.designation}')>"


class Admin(Base):
    """
    Admin Profile Extension: Metadata extending the base user entity for administrators.
    """
    __tablename__ = "admins"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )
    college_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("colleges.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="admin_profile")
    college: Mapped["College"] = relationship("College", back_populates="admins")

    def __repr__(self) -> str:
        return f"<Admin(user_id='{self.user_id}', dept='{self.department}')>"


class Timetable(Base):
    """
    Class Schedule Header: Schedule groups defined by administrators.
    """
    __tablename__ = "timetables"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    college_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("colleges.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False)
    semester: Mapped[str] = mapped_column(String(10), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    section: Mapped[str] = mapped_column(String(10), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )

    __table_args__ = (
        Index("idx_timetables_lookup", "college_id", "department", "semester", "section", "is_active"),
    )

    # Relationships
    college: Mapped["College"] = relationship("College", back_populates="timetables")
    creator: Mapped["User"] = relationship("User", back_populates="created_timetables", foreign_keys=[created_by])
    scheduled_classes: Mapped[List["ScheduledClass"]] = relationship(
        "ScheduledClass", back_populates="timetable", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Timetable(title='{self.title}', dept='{self.department}', sem='{self.semester}', sec='{self.section}')>"


class ScheduledClass(Base):
    """
    Class Period Slots: Specific slots linking Course, Faculty, Day, and Timing.
    """
    __tablename__ = "scheduled_classes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    college_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("colleges.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    timetable_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("timetables.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    subject_name: Mapped[str] = mapped_column(String(150), nullable=False)
    subject_code: Mapped[str] = mapped_column(String(30), nullable=False)
    faculty_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("faculty.id"),
        nullable=False
    )
    day_of_week: Mapped[str] = mapped_column(String(15), nullable=False)
    start_time: Mapped[time] = mapped_column(SQLTime, nullable=False)
    end_time: Mapped[time] = mapped_column(SQLTime, nullable=False)
    room_number: Mapped[str] = mapped_column(String(50), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY')",
            name="check_day_of_week"
        ),
        Index("idx_classes_faculty_schedule", "college_id", "faculty_id", "day_of_week"),
        Index("idx_classes_timetable", "college_id", "timetable_id"),
    )

    # Relationships
    college: Mapped["College"] = relationship("College", back_populates="scheduled_classes")
    timetable: Mapped["Timetable"] = relationship("Timetable", back_populates="scheduled_classes")
    faculty: Mapped["Faculty"] = relationship("Faculty", back_populates="scheduled_classes")
    enrollments: Mapped[List["ClassEnrollment"]] = relationship(
        "ClassEnrollment", back_populates="scheduled_class", cascade="all, delete-orphan"
    )
    attendances: Mapped[List["StudentAttendance"]] = relationship(
        "StudentAttendance", back_populates="scheduled_class"
    )

    def __repr__(self) -> str:
        return f"<ScheduledClass(subject='{self.subject_name}', code='{self.subject_code}', day='{self.day_of_week}')>"


class ClassEnrollment(Base):
    """
    Student Roster: Associates students with their respective scheduled classes.
    """
    __tablename__ = "class_enrollments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    college_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("colleges.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    scheduled_class_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scheduled_classes.id", ondelete="CASCADE"),
        nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False
    )
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint("college_id", "scheduled_class_id", "student_id", name="uq_enrollments_college_class_student"),
        Index("idx_enrollments_student_query", "college_id", "student_id"),
    )

    # Relationships
    college: Mapped["College"] = relationship("College", back_populates="class_enrollments")
    scheduled_class: Mapped["ScheduledClass"] = relationship("ScheduledClass", back_populates="enrollments")
    student: Mapped["Student"] = relationship("Student", back_populates="enrollments")

    def __repr__(self) -> str:
        return f"<ClassEnrollment(class_id='{self.scheduled_class_id}', student_id='{self.student_id}')>"


class StudentAttendance(Base):
    """
    Student Class Attendance: Recorded by faculty for each scheduled class session.
    """
    __tablename__ = "student_attendances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    college_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("colleges.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    scheduled_class_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scheduled_classes.id"),
        nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False
    )
    marked_by_faculty_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("faculty.id"),
        nullable=False
    )
    date: Mapped[date] = mapped_column(SQLDate, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint("status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')", name="check_student_att_status"),
        UniqueConstraint("college_id", "scheduled_class_id", "student_id", "date", name="uq_student_att_class_date"),
        Index("idx_student_att_summary", "college_id", "student_id", "date"),
        Index("idx_student_att_class_date", "college_id", "scheduled_class_id", "date"),
    )

    # Relationships
    college: Mapped["College"] = relationship("College", back_populates="student_attendances")
    scheduled_class: Mapped["ScheduledClass"] = relationship("ScheduledClass", back_populates="attendances")
    student: Mapped["Student"] = relationship("Student", back_populates="attendances")
    marked_by_faculty: Mapped["Faculty"] = relationship(
        "Faculty", back_populates="marked_attendances", foreign_keys=[marked_by_faculty_id]
    )

    def __repr__(self) -> str:
        return f"<StudentAttendance(student_id='{self.student_id}', date='{self.date}', status='{self.status}')>"


class FacultyAttendance(Base):
    """
    Faculty Daily Check-In: Records faculty daily self-attendance.
    """
    __tablename__ = "faculty_attendances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    college_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("colleges.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    faculty_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("faculty.id", ondelete="CASCADE"),
        nullable=False
    )
    date: Mapped[date] = mapped_column(SQLDate, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    check_in_time: Mapped[Optional[time]] = mapped_column(SQLTime, nullable=True)
    check_out_time: Mapped[Optional[time]] = mapped_column(SQLTime, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint("status IN ('PRESENT', 'ABSENT', 'ON_LEAVE', 'HALF_DAY')", name="check_faculty_att_status"),
        UniqueConstraint("college_id", "faculty_id", "date", name="uq_faculty_att_daily"),
        Index("idx_fac_att_daily", "college_id", "faculty_id", "date"),
    )

    # Relationships
    college: Mapped["College"] = relationship("College", back_populates="faculty_attendances")
    faculty: Mapped["Faculty"] = relationship("Faculty", back_populates="attendances")

    def __repr__(self) -> str:
        return f"<FacultyAttendance(faculty_id='{self.faculty_id}', date='{self.date}', status='{self.status}')>"


class Notice(Base):
    """
    Announcements & Circulars: Admin notices published with audience role targeting.
    """
    __tablename__ = "notices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    college_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("colleges.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    target_role: Mapped[str] = mapped_column(String(20), nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint("target_role IN ('ALL', 'FACULTY', 'STUDENT')", name="check_notice_target_role"),
        Index("idx_notices_feed", "college_id", "target_role", "is_published", "published_at"),
    )

    # Relationships
    college: Mapped["College"] = relationship("College", back_populates="notices")
    creator: Mapped["User"] = relationship("User", back_populates="created_notices", foreign_keys=[created_by])

    def __repr__(self) -> str:
        return f"<Notice(title='{self.title}', target='{self.target_role}', published={self.is_published})>"
