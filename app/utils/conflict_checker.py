"""
Timetable and Class Schedule Conflict Checking Engine.
Validates faculty schedule overlap and classroom occupancy rules within tenant college.
"""

import uuid
from datetime import time
from typing import Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import Session

from app.core.exceptions import ScheduleConflictError
from app.models import ScheduledClass


def check_schedule_conflicts(
    db: Session,
    college_id: uuid.UUID,
    day_of_week: str,
    start_time: time,
    end_time: time,
    faculty_id: uuid.UUID,
    room_number: str,
    exclude_class_id: Optional[uuid.UUID] = None,
) -> None:
    """
    Checks for schedule collisions:
    1. Faculty collision: Faculty already teaching another class at overlapping hours.
    2. Room collision: Room is occupied by another class at overlapping hours.
    Raises ScheduleConflictError if a conflict is detected.
    """
    if start_time >= end_time:
        raise ScheduleConflictError(
            f"Class start time ({start_time}) must be earlier than end time ({end_time})."
        )

    # Overlap condition: start_time < existing.end_time AND end_time > existing.start_time
    time_overlap_condition = and_(
        ScheduledClass.start_time < end_time,
        ScheduledClass.end_time > start_time,
    )

    base_filter = and_(
        ScheduledClass.college_id == college_id,
        ScheduledClass.day_of_week == day_of_week,
        time_overlap_condition,
    )

    if exclude_class_id:
        base_filter = and_(base_filter, ScheduledClass.id != exclude_class_id)

    # 1. Check Faculty Conflict
    faculty_conflict_query = select(ScheduledClass).where(
        base_filter,
        ScheduledClass.faculty_id == faculty_id,
    )
    faculty_conflict = db.scalar(faculty_conflict_query)
    if faculty_conflict:
        raise ScheduleConflictError(
            f"Faculty member is already scheduled to teach '{faculty_conflict.subject_name}' "
            f"({faculty_conflict.subject_code}) on {day_of_week} between "
            f"{faculty_conflict.start_time} and {faculty_conflict.end_time}."
        )

    # 2. Check Room Conflict
    room_conflict_query = select(ScheduledClass).where(
        base_filter,
        ScheduledClass.room_number == room_number,
    )
    room_conflict = db.scalar(room_conflict_query)
    if room_conflict:
        raise ScheduleConflictError(
            f"Room '{room_number}' is already booked for '{room_conflict.subject_name}' "
            f"on {day_of_week} between {room_conflict.start_time} and {room_conflict.end_time}."
        )
