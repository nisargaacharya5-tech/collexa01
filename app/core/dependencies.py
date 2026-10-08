"""
FastAPI Dependency Injections:
- Multi-Tenant context resolution and PostgreSQL RLS session anchoring
- JWT Authentication & Current User extraction
- Role-Based Access Control (RBAC) guards (Admin, Faculty, Student)
"""

import uuid
from typing import Generator, List, Optional
from fastapi import Depends, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import (
    UnauthorizedException,
    ForbiddenException,
    TenantNotFoundError,
)
from app.core.security import decode_access_token
from app.core.tenant import resolve_tenant_college, extract_tenant_identifier
from app.database import get_db, set_tenant_context
from app.models import College, User, Admin, Faculty, Student

# HTTP Bearer security scheme
security = HTTPBearer(auto_error=False)


def get_tenant(
    request: Request,
    db: Session = Depends(get_db),
) -> College:
    """
    Dependency that resolves and returns the active College tenant.
    Also executes PostgreSQL RLS SET LOCAL app.current_college_id on the session.
    """
    # Check if already resolved in request state
    if hasattr(request.state, "tenant") and request.state.tenant is not None:
        tenant = request.state.tenant
    else:
        tenant = resolve_tenant_college(db, request, required=True)
        request.state.tenant = tenant

    # Set PostgreSQL RLS transaction context
    set_tenant_context(db, tenant.id)
    return tenant


def get_optional_tenant(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[College]:
    """
    Dependency that optionally resolves tenant if headers/subdomains are present.
    """
    if hasattr(request.state, "tenant") and request.state.tenant is not None:
        return request.state.tenant

    id_type, val = extract_tenant_identifier(request)
    if not val:
        return None

    tenant = resolve_tenant_college(db, request, required=False)
    if tenant:
        request.state.tenant = tenant
        set_tenant_context(db, tenant.id)
    return tenant


def get_current_user(
    request: Request,
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
    tenant: Optional[College] = Depends(get_optional_tenant),
) -> User:
    """
    Decodes the JWT Bearer token, validates tenant consistency,
    and returns the authenticated User instance with attached profiles.
    """
    if not auth_header or not auth_header.credentials:
        raise UnauthorizedException("Bearer token missing or empty")

    token = auth_header.credentials
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise UnauthorizedException("Access token has expired. Please log in again.")
    except jwt.PyJWTError:
        raise UnauthorizedException("Invalid access token format or signature.")

    user_id_str: Optional[str] = payload.get("sub")
    token_college_id_str: Optional[str] = payload.get("college_id")
    role: Optional[str] = payload.get("role")

    if not user_id_str or not token_college_id_str or not role:
        raise UnauthorizedException("Incomplete token claims payload")

    try:
        user_uuid = uuid.UUID(user_id_str)
        token_college_uuid = uuid.UUID(token_college_id_str)
    except ValueError:
        raise UnauthorizedException("Invalid UUID claims in token")

    # If tenant was resolved from headers/subdomain, ensure token's college matches
    if tenant and tenant.id != token_college_uuid:
        raise ForbiddenException("Token college_id does not match the active tenant context")

    # If tenant was not explicitly passed in header, set RLS context from token
    if not tenant:
        tenant_obj = db.scalar(select(College).where(College.id == token_college_uuid, College.status == "ACTIVE"))
        if not tenant_obj:
            raise TenantNotFoundError("Tenant associated with token not found or inactive")
        request.state.tenant = tenant_obj
        set_tenant_context(db, token_college_uuid)

    # Query user with eager-loaded profile according to role
    query = (
        select(User)
        .where(
            User.id == user_uuid,
            User.college_id == token_college_uuid,
            User.is_active == True,
        )
        .options(
            joinedload(User.admin_profile),
            joinedload(User.faculty_profile),
            joinedload(User.student_profile),
            joinedload(User.college),
        )
    )

    user = db.scalar(query)
    if not user:
        raise UnauthorizedException("User account not found or has been deactivated")

    # Store user in request state for convenient controller access
    request.state.current_user = user
    return user


class RoleChecker:
    """
    Dependency class enforcing that the current user possesses one of the allowed roles.
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise ForbiddenException(
                f"Role '{current_user.role}' is not authorized to access this resource. Required: {self.allowed_roles}"
            )
        return current_user


# Role-specific dependency shortcuts
require_admin = RoleChecker(["ADMIN"])
require_faculty = RoleChecker(["FACULTY"])
require_student = RoleChecker(["STUDENT"])
require_faculty_or_admin = RoleChecker(["FACULTY", "ADMIN"])
require_any_authenticated = RoleChecker(["ADMIN", "FACULTY", "STUDENT"])
