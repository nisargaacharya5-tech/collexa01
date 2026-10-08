"""
Application exception classes and error responses.
Provides clean and standardized error payloads across all endpoints.
"""

from typing import Any, Optional
from fastapi import HTTPException, status


class ColexaHTTPException(HTTPException):
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        headers: Optional[dict[str, str]] = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code or "ERROR"


class TenantNotFoundError(ColexaHTTPException):
    def __init__(self, detail: str = "Tenant college not found or inactive"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="TENANT_NOT_FOUND",
        )


class UnauthorizedException(ColexaHTTPException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="UNAUTHORIZED",
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenException(ColexaHTTPException):
    def __init__(self, detail: str = "Insufficient permissions for this operation"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="FORBIDDEN",
        )


class ResourceNotFoundError(ColexaHTTPException):
    def __init__(self, resource_name: str = "Resource", identifier: Any = None):
        detail = f"{resource_name} not found"
        if identifier:
            detail = f"{resource_name} '{identifier}' not found"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="NOT_FOUND",
        )


class ScheduleConflictError(ColexaHTTPException):
    def __init__(self, detail: str = "Schedule timing conflict detected"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="SCHEDULE_CONFLICT",
        )


class ResourceConflictError(ColexaHTTPException):
    def __init__(self, detail: str = "Resource already exists or violates uniqueness"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="RESOURCE_CONFLICT",
        )


class BadRequestError(ColexaHTTPException):
    def __init__(self, detail: str = "Invalid request parameter"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="BAD_REQUEST",
        )
