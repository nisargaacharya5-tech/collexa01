"""
Models package for Colexa backend
Exposes all SQLAlchemy 2.0 declarative models adhering to database_schema.md.
"""

from models import (
    Base,
    College,
    User,
    Student,
    Faculty,
    Admin,
    Timetable,
    ScheduledClass,
    ClassEnrollment,
    StudentAttendance,
    FacultyAttendance,
    Notice,
)

__all__ = [
    "Base",
    "College",
    "User",
    "Student",
    "Faculty",
    "Admin",
    "Timetable",
    "ScheduledClass",
    "ClassEnrollment",
    "StudentAttendance",
    "FacultyAttendance",
    "Notice",
]
