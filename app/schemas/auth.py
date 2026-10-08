"""
Authentication and Session Schemas
"""

import uuid
from datetime import datetime
from typing import Optional, Union, Literal
from pydantic import BaseModel, EmailStr, ConfigDict

from app.schemas.common import CollegeResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    college_id: Optional[uuid.UUID] = None
    college_code: Optional[str] = None


class StudentProfileSummary(BaseModel):
    id: uuid.UUID
    enrollment_no: str
    department: str
    batch_year: str
    section: str

    model_config = ConfigDict(from_attributes=True)


class FacultyProfileSummary(BaseModel):
    id: uuid.UUID
    employee_id: str
    department: str
    designation: str

    model_config = ConfigDict(from_attributes=True)


class AdminProfileSummary(BaseModel):
    id: uuid.UUID
    department: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserProfileResponse(BaseModel):
    id: uuid.UUID
    college_id: uuid.UUID
    email: str
    full_name: str
    role: Literal["STUDENT", "FACULTY", "ADMIN"]
    is_active: bool
    created_at: datetime
    college: Optional[CollegeResponse] = None
    student_profile: Optional[StudentProfileSummary] = None
    faculty_profile: Optional[FacultyProfileSummary] = None
    admin_profile: Optional[AdminProfileSummary] = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserProfileResponse
