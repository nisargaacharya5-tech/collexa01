"""
Common Schemas and DTOs
"""

import uuid
from datetime import datetime
from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


class ErrorResponse(BaseModel):
    detail: str
    error_code: str = "ERROR"


class CollegeResponse(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    domain: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthorMetadata(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True)
