"""
Authentication Router (/api/v1/auth)
Handles user login, current session profile retrieval, and logout.
"""

from datetime import timedelta
import uuid
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.core.dependencies import get_current_user, get_optional_tenant, get_db
from app.core.exceptions import (
    UnauthorizedException,
    TenantNotFoundError,
    BadRequestError,
)
from app.core.security import create_access_token, verify_password
from app.database import set_tenant_context
from app.models import College, User
from app.schemas.auth import LoginRequest, TokenResponse, UserProfileResponse
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user & issue JWT",
    status_code=status.HTTP_200_OK,
)
def login(
    request: Request,
    payload: LoginRequest,
    db: Session = Depends(get_db),
    tenant: College | None = Depends(get_optional_tenant),
):
    """
    Authenticates user credentials against the specified college tenant and returns a JWT token.
    Tenant context is resolved from HTTP headers, subdomain, or request body.
    """
    # 1. Resolve Tenant Context
    active_college = tenant
    if not active_college:
        if payload.college_id:
            active_college = db.scalar(
                select(College).where(College.id == payload.college_id, College.status == "ACTIVE")
            )
        elif payload.college_code:
            active_college = db.scalar(
                select(College).where(College.code == payload.college_code.strip(), College.status == "ACTIVE")
            )

    if not active_college:
        raise TenantNotFoundError(
            "College identification required. Provide 'X-College-ID' header, subdomain, or college_id in request."
        )

    # Set PostgreSQL RLS context
    set_tenant_context(db, active_college.id)

    # 2. Query user by tenant and email
    normalized_email = payload.email.strip().lower()
    query = (
        select(User)
        .where(
            User.college_id == active_college.id,
            User.email == normalized_email,
            User.is_active == True,
        )
        .options(
            joinedload(User.student_profile),
            joinedload(User.faculty_profile),
            joinedload(User.admin_profile),
            joinedload(User.college),
        )
    )
    user = db.scalar(query)

    if not user or not verify_password(payload.password, user.hashed_password):
        raise UnauthorizedException("Invalid email or password for this college.")

    # 3. Generate JWT Token
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=user.id,
        college_id=active_college.id,
        role=user.role,
        expires_delta=expires_delta,
        extra_claims={"email": user.email, "full_name": user.full_name},
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserProfileResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="View authenticated profile session",
    status_code=status.HTTP_200_OK,
)
def get_me(
    current_user: User = Depends(get_current_user),
):
    """
    Returns the authenticated user's profile, role details, and associated tenant college.
    """
    return UserProfileResponse.model_validate(current_user)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Invalidate user session",
    status_code=status.HTTP_200_OK,
)
def logout(
    current_user: User = Depends(get_current_user),
):
    """
    Stateless JWT logout endpoint.
    Client discards token upon successful call.
    """
    return MessageResponse(
        message="Session terminated successfully.",
        detail=f"User {current_user.email} logged out.",
    )
