#!/usr/bin/env python3
"""
Colexa Database Seeder (seed_db.py)
Seeds local PostgreSQL database with realistic dummy data:
- 2 Colleges (Apex Institute of Technology, Horizon University)
- 2 Admins (1 per College)
- 10 Faculty Members (5 per College across distinct departments)
- 50 Students (25 per College across distinct departments, cohorts, and sections)
- Complete relational structures: Timetables, Scheduled Classes, Class Enrollments,
  Faculty Attendances, Student Attendances, and Notices.

Adheres strictly to database_schema.md constraints and multi-tenant isolation.
"""

import argparse
import os
import random
import sys
import uuid
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

# Ensure UTF-8 output on Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from sqlalchemy import create_engine, select, delete, text
from sqlalchemy.orm import sessionmaker

# Import SQLAlchemy models
from models import (
    Base,
    College,
    User,
    Admin,
    Faculty,
    Student,
    Timetable,
    ScheduledClass,
    ClassEnrollment,
    StudentAttendance,
    FacultyAttendance,
    Notice,
)


def load_env_variables() -> dict:
    """
    Parses .env file if present in current or parent directory,
    falling back to os.environ and Colexa defaults.
    """
    env_vars = {}
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    env_vars[key.strip()] = val.strip().strip("'\"")

    return {
        "POSTGRES_USER": os.getenv("POSTGRES_USER", env_vars.get("POSTGRES_USER", "colexa_user")),
        "POSTGRES_PASSWORD": os.getenv("POSTGRES_PASSWORD", env_vars.get("POSTGRES_PASSWORD", "colexa_password")),
        "POSTGRES_DB": os.getenv("POSTGRES_DB", env_vars.get("POSTGRES_DB", "colexa_db")),
        "POSTGRES_PORT": os.getenv("POSTGRES_PORT", env_vars.get("POSTGRES_PORT", "5432")),
        "POSTGRES_HOST": os.getenv("POSTGRES_HOST", env_vars.get("POSTGRES_HOST", "localhost")),
    }


def get_database_url(custom_url: str = None) -> str:
    """Constructs the PostgreSQL connection URL."""
    if custom_url:
        return custom_url
    env = load_env_variables()
    return f"postgresql+psycopg2://{env['POSTGRES_USER']}:{env['POSTGRES_PASSWORD']}@{env['POSTGRES_HOST']}:{env['POSTGRES_PORT']}/{env['POSTGRES_DB']}"


# Standard bcrypt hash for "Password@123" to enable immediate login testing
DEFAULT_PASSWORD_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4L5b9mke2G"
DEFAULT_RAW_PASSWORD = "Password@123"

# Realistic names catalog
FIRST_NAMES = [
    "Aarav", "Aditi", "Rohan", "Diya", "Kabir", "Ananya", "Ishaan", "Pooja",
    "Vikram", "Sneha", "Kunal", "Tanvi", "Arjun", "Kavya", "Rahul", "Meera",
    "Siddharth", "Nisha", "Aditya", "Riya", "Varun", "Shruti", "Akash", "Swati",
    "Nikhil", "Divya", "Gaurav", "Preeti", "Manish", "Neha", "Sameer", "Simran",
    "Harsh", "Priyanka", "Deepak", "Aayushi", "Pranav", "Shreya", "Raj", "Bhavna",
    "Karan", "Rashmi", "Yash", "Pallavi", "Alok", "Monika", "Tarun", "Sakshi",
    "Sanjay", "Ankita", "Chirag", "Bhumika", "Kartik", "Lavanya", "Naveen", "Shilpa"
]

LAST_NAMES = [
    "Sharma", "Patel", "Verma", "Rao", "Nair", "Kulkarni", "Deshmukh", "Gupta",
    "Mehta", "Iyer", "Reddy", "Joshi", "Bhat", "Chopra", "Shetty", "Singh",
    "Das", "Menon", "Pillai", "Hegde", "Mishra", "Pandey", "Saxena", "Bose"
]


def generate_unique_name(used_names: set) -> tuple:
    """Generates realistic unique full names."""
    for first in FIRST_NAMES:
        for last in LAST_NAMES:
            name = f"{first} {last}"
            if name not in used_names:
                used_names.add(name)
                return first, last, name
    # Fallback with random suffix if exhausted
    rand_first = random.choice(FIRST_NAMES)
    rand_last = random.choice(LAST_NAMES)
    suffix = random.randint(10, 99)
    name = f"{rand_first} {rand_last} {suffix}"
    used_names.add(name)
    return rand_first, rand_last, name


def clean_existing_seeded_data(session, college_codes: list):
    """
    Cleans up previously seeded colleges and all cascaded children.
    Ensures script can be re-run safely without primary or unique key violations.
    """
    print("[*] Cleaning existing data for seeded colleges...")
    for code in college_codes:
        existing_colleges = session.query(College).filter(College.code == code).all()
        for college in existing_colleges:
            print(f"    - Removing existing college: {college.name} ({college.code})")
            session.delete(college)
    session.commit()
    print("    - Cleaned up existing records successfully.")


def seed_database(db_url: str, clean: bool = False, dry_run: bool = False):
    """Main database seeding function."""
    print("=" * 72)
    print("                 COLEXA MULTI-TENANT DATABASE SEEDER")
    print("=" * 72)
    safe_display_url = db_url.split("@")[-1] if "@" in db_url else db_url
    print(f"[*] Target Database: {safe_display_url}")

    engine = create_engine(db_url, echo=False)

    # Test connection
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        print("\n[!] DATABASE CONNECTION FAILED:")
        print(f"    {exc}")
        print("\n[?] Troubleshooting Guide:")
        print("    1. Ensure PostgreSQL is running on localhost:5432.")
        print("    2. If using Docker, run:")
        print("       docker compose up -d database")
        print("    3. Check your .env credentials:")
        print("       POSTGRES_USER=colexa_user")
        print("       POSTGRES_PASSWORD=colexa_password")
        print("       POSTGRES_DB=colexa_db")
        print("       POSTGRES_PORT=5432")
        sys.exit(1)

    print("[OK] Database connection verified.")

    # Ensure tables exist
    print("[*] Verifying database schema tables against SQLAlchemy models...")
    Base.metadata.create_all(bind=engine)
    print("[OK] All 11 schema tables verified in database.")

    Session = sessionmaker(bind=engine)
    session = Session()

    college_specs = [
        {
            "code": "apex-tech",
            "name": "Apex Institute of Technology",
            "domain": "apextech.edu",
            "usn_prefix": "1AP",
            "fac_prefix": "APEX-FAC",
            "departments": [
                "Computer Science & Engineering",
                "Information Science & Engineering",
                "Electronics & Communication Engineering",
                "Mechanical Engineering",
            ],
            "admin": {
                "name": "Dr. Rajesh Sharma",
                "email": "admin@apextech.edu",
                "dept": "Academic Administration",
            },
            "faculty_specs": [
                {"dept": "Computer Science & Engineering", "desig": "Professor & HOD", "name": "Dr. Arvind Kumar"},
                {"dept": "Computer Science & Engineering", "desig": "Associate Professor", "name": "Prof. Sunita Rao"},
                {"dept": "Information Science & Engineering", "desig": "Professor", "name": "Dr. Ramesh Gupta"},
                {"dept": "Electronics & Communication Engineering", "desig": "Assistant Professor", "name": "Prof. Vikram Mehta"},
                {"dept": "Mechanical Engineering", "desig": "Assistant Professor", "name": "Prof. Ananya Iyer"},
            ],
            # 25 students distribution: CSE: 10, ISE: 6, ECE: 5, ME: 4
            "student_distribution": [
                {"dept": "Computer Science & Engineering", "batch": "2023-2027", "sec": "A", "count": 5},
                {"dept": "Computer Science & Engineering", "batch": "2024-2028", "sec": "B", "count": 5},
                {"dept": "Information Science & Engineering", "batch": "2023-2027", "sec": "A", "count": 3},
                {"dept": "Information Science & Engineering", "batch": "2024-2028", "sec": "A", "count": 3},
                {"dept": "Electronics & Communication Engineering", "batch": "2023-2027", "sec": "A", "count": 3},
                {"dept": "Electronics & Communication Engineering", "batch": "2024-2028", "sec": "B", "count": 2},
                {"dept": "Mechanical Engineering", "batch": "2023-2027", "sec": "A", "count": 2},
                {"dept": "Mechanical Engineering", "batch": "2024-2028", "sec": "A", "count": 2},
            ],
            "courses": [
                {
                    "title": "CSE 5th Sem - Section A (2026-2027)",
                    "dept": "Computer Science & Engineering",
                    "sem": "5",
                    "sec": "A",
                    "academic_year": "2026-2027",
                    "classes": [
                        {"sub": "Operating Systems", "code": "CS501", "fac_idx": 0, "day": "MONDAY", "start": time(9, 0), "end": time(10, 0), "room": "LH-301"},
                        {"sub": "Database Management Systems", "code": "CS502", "fac_idx": 1, "day": "TUESDAY", "start": time(10, 15), "end": time(11, 15), "room": "Lab-2"},
                        {"sub": "Computer Networks", "code": "CS503", "fac_idx": 0, "day": "WEDNESDAY", "start": time(11, 30), "end": time(12, 30), "room": "LH-301"},
                    ]
                },
                {
                    "title": "ECE 3rd Sem - Section A (2026-2027)",
                    "dept": "Electronics & Communication Engineering",
                    "sem": "3",
                    "sec": "A",
                    "academic_year": "2026-2027",
                    "classes": [
                        {"sub": "Digital Electronics", "code": "EC301", "fac_idx": 3, "day": "THURSDAY", "start": time(9, 0), "end": time(10, 0), "room": "LH-204"},
                        {"sub": "Signals & Systems", "code": "EC302", "fac_idx": 3, "day": "FRIDAY", "start": time(10, 15), "end": time(11, 15), "room": "Lab-EC1"},
                    ]
                }
            ],
            "notices": [
                {"title": "Commencement of Odd Semester 2026", "content": "Classes for 3rd, 5th, and 7th semesters commence from next Monday. Timetables are published on the portal.", "target": "ALL"},
                {"title": "Faculty Academic Council Meeting", "content": "All department heads and faculty members are requested to attend the council meeting on Friday at 3:00 PM in the Board Room.", "target": "FACULTY"},
                {"title": "Mid-Semester Examination Schedule", "content": "The mid-semester evaluation tests will commence from the 15th of this month. Minimum 75% attendance is required to sit for the exams.", "target": "STUDENT"},
            ]
        },
        {
            "code": "horizon-univ",
            "name": "Horizon University",
            "domain": "horizonuniv.edu",
            "usn_prefix": "1HZ",
            "fac_prefix": "HZ-FAC",
            "departments": [
                "Computer Science & Engineering",
                "Information Science & Engineering",
                "Electronics & Communication Engineering",
                "Civil Engineering",
            ],
            "admin": {
                "name": "Dr. Priya Nair",
                "email": "admin@horizonuniv.edu",
                "dept": "Office of the Registrar",
            },
            "faculty_specs": [
                {"dept": "Computer Science & Engineering", "desig": "Professor & HOD", "name": "Dr. Suresh Kulkarni"},
                {"dept": "Computer Science & Engineering", "desig": "Associate Professor", "name": "Prof. Meera Nambiar"},
                {"dept": "Information Science & Engineering", "desig": "Professor", "name": "Dr. Deepa Joshi"},
                {"dept": "Electronics & Communication Engineering", "desig": "Assistant Professor", "name": "Prof. Karthik Raman"},
                {"dept": "Civil Engineering", "desig": "Assistant Professor", "name": "Prof. Pooja Hegde"},
            ],
            # 25 students distribution: CSE: 10, ISE: 6, ECE: 5, CVE: 4
            "student_distribution": [
                {"dept": "Computer Science & Engineering", "batch": "2023-2027", "sec": "A", "count": 5},
                {"dept": "Computer Science & Engineering", "batch": "2024-2028", "sec": "B", "count": 5},
                {"dept": "Information Science & Engineering", "batch": "2023-2027", "sec": "A", "count": 3},
                {"dept": "Information Science & Engineering", "batch": "2024-2028", "sec": "A", "count": 3},
                {"dept": "Electronics & Communication Engineering", "batch": "2023-2027", "sec": "A", "count": 3},
                {"dept": "Electronics & Communication Engineering", "batch": "2024-2028", "sec": "B", "count": 2},
                {"dept": "Civil Engineering", "batch": "2023-2027", "sec": "A", "count": 2},
                {"dept": "Civil Engineering", "batch": "2024-2028", "sec": "A", "count": 2},
            ],
            "courses": [
                {
                    "title": "CSE 5th Sem - Section A (2026-2027)",
                    "dept": "Computer Science & Engineering",
                    "sem": "5",
                    "sec": "A",
                    "academic_year": "2026-2027",
                    "classes": [
                        {"sub": "Design & Analysis of Algorithms", "code": "CS501", "fac_idx": 0, "day": "MONDAY", "start": time(9, 0), "end": time(10, 0), "room": "Audi-1"},
                        {"sub": "Artificial Intelligence & ML", "code": "CS502", "fac_idx": 1, "day": "TUESDAY", "start": time(10, 15), "end": time(11, 15), "room": "Lab-AI"},
                        {"sub": "Cloud Computing", "code": "CS503", "fac_idx": 0, "day": "THURSDAY", "start": time(11, 30), "end": time(12, 30), "room": "LH-102"},
                    ]
                },
                {
                    "title": "CVE 3rd Sem - Section A (2026-2027)",
                    "dept": "Civil Engineering",
                    "sem": "3",
                    "sec": "A",
                    "academic_year": "2026-2027",
                    "classes": [
                        {"sub": "Structural Analysis", "code": "CV301", "fac_idx": 4, "day": "WEDNESDAY", "start": time(9, 0), "end": time(10, 0), "room": "LH-CV1"},
                        {"sub": "Fluid Mechanics", "code": "CV302", "fac_idx": 4, "day": "FRIDAY", "start": time(10, 15), "end": time(11, 15), "room": "Lab-Fluids"},
                    ]
                }
            ],
            "notices": [
                {"title": "Annual University Tech Fest 'HorizonX' Announcement", "content": "Registration is now open for hackathons, paper presentations, and robotics competitions. Visit the campus portal to register.", "target": "ALL"},
                {"title": "Research Grant Applications Open", "content": "Faculty members interested in applying for internal research funding for FY 2026-2027 must submit proposals by end of month.", "target": "FACULTY"},
                {"title": "Hostel Fee Payment Deadline", "content": "All resident students must clear semester hostel and mess dues before the 10th of next month to avoid late fines.", "target": "STUDENT"},
            ]
        }
    ]

    try:
        codes = [c["code"] for c in college_specs]
        if clean:
            clean_existing_seeded_data(session, codes)
        else:
            existing = session.query(College).filter(College.code.in_(codes)).first()
            if existing:
                print(f"[!] Warning: Seeded college '{existing.code}' already exists in database.")
                print("[*] Re-cleaning previous seed data to ensure fresh, consistent IDs...")
                clean_existing_seeded_data(session, codes)

        stats = {
            "colleges": 0,
            "admins": 0,
            "faculty": 0,
            "students": 0,
            "timetables": 0,
            "classes": 0,
            "enrollments": 0,
            "faculty_attendances": 0,
            "student_attendances": 0,
            "notices": 0,
        }

        used_names = set()

        # Dates for attendance history (past 5 working days)
        today = date.today()
        recent_dates = []
        d = today - timedelta(days=1)
        while len(recent_dates) < 5:
            if d.weekday() < 5:  # Monday to Friday
                recent_dates.append(d)
            d -= timedelta(days=1)
        recent_dates.reverse()

        print("\n[*] Seeding multi-tenant institutional records...")

        sample_credentials = []

        for spec in college_specs:
            college_name = spec["name"]
            college_code = spec["code"]
            print(f"\n[+] Provisioning Tenant: {college_name} ({college_code})")

            # 1. College Entity
            college = College(
                id=uuid.uuid4(),
                code=college_code,
                name=college_name,
                domain=spec["domain"],
                status="ACTIVE"
            )
            session.add(college)
            session.flush()
            stats["colleges"] += 1

            # 2. Admin User & Profile
            admin_spec = spec["admin"]
            admin_user = User(
                id=uuid.uuid4(),
                college_id=college.id,
                email=admin_spec["email"],
                hashed_password=DEFAULT_PASSWORD_HASH,
                full_name=admin_spec["name"],
                role="ADMIN",
                is_active=True
            )
            session.add(admin_user)
            session.flush()

            admin_profile = Admin(
                id=uuid.uuid4(),
                user_id=admin_user.id,
                college_id=college.id,
                department=admin_spec["dept"]
            )
            session.add(admin_profile)
            stats["admins"] += 1

            # 3. Faculty Members (5 per college = 10 total)
            faculty_records = []
            for idx, fac_spec in enumerate(spec["faculty_specs"], 1):
                fac_name = fac_spec["name"]
                first_name_clean = fac_name.lower().replace("dr. ", "").replace("prof. ", "").replace(" ", ".")
                fac_email = f"{first_name_clean}@{spec['domain']}"
                emp_id = f"{spec['fac_prefix']}-{idx:03d}"

                fac_user = User(
                    id=uuid.uuid4(),
                    college_id=college.id,
                    email=fac_email,
                    hashed_password=DEFAULT_PASSWORD_HASH,
                    full_name=fac_name,
                    role="FACULTY",
                    is_active=True
                )
                session.add(fac_user)
                session.flush()

                faculty = Faculty(
                    id=uuid.uuid4(),
                    user_id=fac_user.id,
                    college_id=college.id,
                    employee_id=emp_id,
                    department=fac_spec["dept"],
                    designation=fac_spec["desig"]
                )
                session.add(faculty)
                session.flush()
                faculty_records.append(faculty)
                stats["faculty"] += 1

                # Daily Faculty Attendance for recent dates
                for att_date in recent_dates:
                    fac_att = FacultyAttendance(
                        id=uuid.uuid4(),
                        college_id=college.id,
                        faculty_id=faculty.id,
                        date=att_date,
                        status="PRESENT",
                        check_in_time=time(8, random.randint(45, 58)),
                        check_out_time=time(16, random.randint(30, 50))
                    )
                    session.add(fac_att)
                    stats["faculty_attendances"] += 1

            # 4. Students (25 per college = 50 total across different departments)
            student_records = []
            usn_counter = 1

            for dist in spec["student_distribution"]:
                dept = dist["dept"]
                batch = dist["batch"]
                section = dist["sec"]
                dept_code = "".join([w[0] for w in dept.split() if w[0].isupper()])[:2]

                for _ in range(dist["count"]):
                    first, last, full_name = generate_unique_name(used_names)
                    student_email = f"{first.lower()}.{last.lower()}@student.{spec['domain']}"
                    batch_short = batch.split("-")[0][-2:]
                    usn = f"{spec['usn_prefix']}{batch_short}{dept_code}{usn_counter:03d}"
                    usn_counter += 1

                    stu_user = User(
                        id=uuid.uuid4(),
                        college_id=college.id,
                        email=student_email,
                        hashed_password=DEFAULT_PASSWORD_HASH,
                        full_name=full_name,
                        role="STUDENT",
                        is_active=True
                    )
                    session.add(stu_user)
                    session.flush()

                    student = Student(
                        id=uuid.uuid4(),
                        user_id=stu_user.id,
                        college_id=college.id,
                        enrollment_no=usn,
                        department=dept,
                        batch_year=batch,
                        section=section
                    )
                    session.add(student)
                    session.flush()
                    student_records.append(student)
                    stats["students"] += 1

            # 5. Timetables & Scheduled Classes
            scheduled_class_records = []
            for course_spec in spec["courses"]:
                tt = Timetable(
                    id=uuid.uuid4(),
                    college_id=college.id,
                    title=course_spec["title"],
                    academic_year=course_spec["academic_year"],
                    semester=course_spec["sem"],
                    department=course_spec["dept"],
                    section=course_spec["sec"],
                    is_active=True,
                    created_by=admin_user.id
                )
                session.add(tt)
                session.flush()
                stats["timetables"] += 1

                for cls_spec in course_spec["classes"]:
                    assigned_faculty = faculty_records[cls_spec["fac_idx"]]
                    scheduled_class = ScheduledClass(
                        id=uuid.uuid4(),
                        college_id=college.id,
                        timetable_id=tt.id,
                        subject_name=cls_spec["sub"],
                        subject_code=cls_spec["code"],
                        faculty_id=assigned_faculty.id,
                        day_of_week=cls_spec["day"],
                        start_time=cls_spec["start"],
                        end_time=cls_spec["end"],
                        room_number=cls_spec["room"]
                    )
                    session.add(scheduled_class)
                    session.flush()
                    scheduled_class_records.append((scheduled_class, course_spec["dept"], course_spec["sec"]))
                    stats["classes"] += 1

            # 6. Class Enrollments & Student Attendance
            for sc, dept, sec in scheduled_class_records:
                eligible_students = [
                    s for s in student_records
                    if s.department == dept and s.section == sec
                ]
                if not eligible_students:
                    eligible_students = [s for s in student_records if s.department == dept]

                for stu in eligible_students:
                    enrollment = ClassEnrollment(
                        id=uuid.uuid4(),
                        college_id=college.id,
                        scheduled_class_id=sc.id,
                        student_id=stu.id
                    )
                    session.add(enrollment)
                    stats["enrollments"] += 1

                    for att_date in recent_dates[:3]:
                        status_choice = random.choices(
                            ["PRESENT", "ABSENT", "LATE", "EXCUSED"],
                            weights=[85, 10, 3, 2]
                        )[0]
                        remarks = "Late arrival due to traffic" if status_choice == "LATE" else None

                        stu_att = StudentAttendance(
                            id=uuid.uuid4(),
                            college_id=college.id,
                            scheduled_class_id=sc.id,
                            student_id=stu.id,
                            marked_by_faculty_id=sc.faculty_id,
                            date=att_date,
                            status=status_choice,
                            remarks=remarks
                        )
                        session.add(stu_att)
                        stats["student_attendances"] += 1

            # 7. Notices
            for notice_spec in spec["notices"]:
                notice = Notice(
                    id=uuid.uuid4(),
                    college_id=college.id,
                    title=notice_spec["title"],
                    content=notice_spec["content"],
                    target_role=notice_spec["target"],
                    is_published=True,
                    created_by=admin_user.id
                )
                session.add(notice)
                stats["notices"] += 1

            sample_credentials.append({
                "college": college_name,
                "code": college_code,
                "admin": admin_user.email,
                "faculty": faculty_records[0].user.email,
                "faculty_desig": faculty_records[0].designation,
                "student": student_records[0].user.email,
                "student_usn": student_records[0].enrollment_no,
            })

            session.commit()
            print(f"    [OK] Seeded 1 Admin, {len(faculty_records)} Faculty, {len(student_records)} Students, Timetables, Classes, and Notices")

        print("\n" + "=" * 72)
        print("                 DATABASE SEEDING COMPLETED SUCCESSFULLY")
        print("=" * 72)
        print("Summary of Seeded Entities:")
        print(f"  * Colleges (Tenants):    {stats['colleges']}")
        print(f"  * Admins:                {stats['admins']}")
        print(f"  * Faculty Members:       {stats['faculty']}")
        print(f"  * Students:              {stats['students']}")
        print(f"  * Timetables:            {stats['timetables']}")
        print(f"  * Scheduled Classes:     {stats['classes']}")
        print(f"  * Class Enrollments:     {stats['enrollments']}")
        print(f"  * Faculty Attendances:   {stats['faculty_attendances']}")
        print(f"  * Student Attendances:   {stats['student_attendances']}")
        print(f"  * Institutional Notices: {stats['notices']}")

        print("\nSample Login Credentials (Password for all accounts: Password@123):")
        print("-" * 72)
        for cred in sample_credentials:
            print(f"  [{cred['college']} - Slug: {cred['code']}]")
            print(f"    Admin:   {cred['admin']}")
            print(f"    Faculty: {cred['faculty']} ({cred['faculty_desig']})")
            print(f"    Student: {cred['student']} (Roll/USN: {cred['student_usn']})")
            print()
        print("-" * 72)

    except Exception as exc:
        session.rollback()
        print("\n[!] AN ERROR OCCURRED DURING SEEDING:")
        print(f"    {exc}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        session.close()
        engine.dispose()


def main():
    parser = argparse.ArgumentParser(description="Seed Colexa PostgreSQL database with realistic tenant data.")
    parser.add_argument("--db-url", type=str, default=None, help="PostgreSQL connection URL override")
    parser.add_argument("--clean", action="store_true", help="Remove existing seeded colleges and records before seeding")
    args = parser.parse_args()

    db_url = get_database_url(args.db_url)
    seed_database(db_url, clean=args.clean)


if __name__ == "__main__":
    main()
