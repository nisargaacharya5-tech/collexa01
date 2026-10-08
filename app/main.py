"""
Colexa FastAPI Backend Application Entrypoint.
Configures FastAPI app, CORS middleware, global exception handlers,
health checks, and mounts modular APIRouters.
"""

from typing import List
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import ColexaHTTPException
from app.database import get_db
from app.models import College
from app.routers import auth_router, admin_router, faculty_router, student_router
from app.schemas.common import CollegeResponse

app = FastAPI(
    title="Colexa Enterprise API",
    description="Multi-Tenant College Management Backend (Adhering strictly to PRD and API Spec)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ------------------------------------------------------------------------------
# CORS Middleware Configuration
# ------------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-College-ID", "Content-Disposition"],
)


# ------------------------------------------------------------------------------
# Exception Handlers
# ------------------------------------------------------------------------------
@app.exception_handler(ColexaHTTPException)
async def colexa_exception_handler(request: Request, exc: ColexaHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": exc.error_code,
        },
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join([str(l) for l in err.get("loc", [])])
        msg = err.get("msg", "Validation error")
        errors.append(f"{loc}: {msg}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "; ".join(errors),
            "error_code": "VALIDATION_ERROR",
            "errors": exc.errors(),
        },
    )


# ------------------------------------------------------------------------------
# Public / Discovery / Health Routes
# ------------------------------------------------------------------------------
@app.get("/health", tags=["Health"], summary="System health check")
@app.get("/api/v1/health", tags=["Health"], summary="System health check")
def health_check():
    return {
        "status": "healthy",
        "service": "Colexa API",
        "environment": settings.APP_ENV,
        "version": "1.0.0",
    }


@app.get(
    "/api/v1/colleges",
    response_model=List[CollegeResponse],
    tags=["Tenant Discovery"],
    summary="List active colleges for tenant selection",
)
def list_active_colleges():
    """Public discovery endpoint enabling users and frontend to look up colleges."""
    db_gen = get_db()
    db: Session = next(db_gen)
    try:
        colleges = db.scalars(
            select(College).where(College.status == "ACTIVE").order_by(College.name)
        ).all()
        return colleges
    finally:
        db_gen.close()


# ------------------------------------------------------------------------------
# Mount APIRouters under /api/v1
# ------------------------------------------------------------------------------
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(faculty_router, prefix=settings.API_V1_STR)
app.include_router(student_router, prefix=settings.API_V1_STR)
