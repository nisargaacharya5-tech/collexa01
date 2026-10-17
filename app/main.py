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

from contextlib import asynccontextmanager
from app.config import settings
from app.core.exceptions import ColexaHTTPException
from app.database import get_db, engine
from app.models import Base, College
from app.routers import auth_router, admin_router, faculty_router, student_router
from app.schemas.common import CollegeResponse


from fastapi import Depends

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables if running in SQLite / new DB
    try:
        Base.metadata.create_all(bind=engine)
        # Auto seed default demo data if colleges table is empty
        from app.database import SessionLocal
        with SessionLocal() as db:
            count = db.query(College).count()
            if count == 0:
                print("[*] Colleges table is empty. Running initial database seed...")
                try:
                    import seed_db
                    seed_db.seed_database(custom_engine=engine)
                except Exception as seed_err:
                    print(f"[!] Comprehensive seeder encountered an issue: {seed_err}")
                    # Ensure at least the two core tenant colleges exist
                    db.rollback()
                    c1 = College(
                        code="apex-tech",
                        name="Apex Institute of Technology",
                        domain="apextech.edu",
                        status="ACTIVE",
                    )
                    c2 = College(
                        code="horizon-univ",
                        name="Horizon University",
                        domain="horizon.edu",
                        status="ACTIVE",
                    )
                    db.add_all([c1, c2])
                    db.commit()
                    print("[OK] Fallback tenant colleges successfully created.")
    except Exception as e:
        print(f"Startup initialization notice: {e}")
    yield


app = FastAPI(
    title="Colexa Enterprise API",
    description="Multi-Tenant College Management Backend (Adhering strictly to PRD and API Spec)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ------------------------------------------------------------------------------
# CORS Middleware Configuration
# ------------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
def list_active_colleges(db: Session = Depends(get_db)):
    """Public discovery endpoint enabling users and frontend to look up colleges."""
    try:
        colleges = db.scalars(
            select(College).where(College.status == "ACTIVE").order_by(College.name)
        ).all()
        return colleges
    except Exception as exc:
        print(f"[!] Warning: list_active_colleges query issue: {exc}")
        # Auto-create tables and return default list if table wasn't ready
        try:
            Base.metadata.create_all(bind=engine)
            colleges = db.scalars(
                select(College).where(College.status == "ACTIVE").order_by(College.name)
            ).all()
            return colleges
        except Exception:
            return []


# ------------------------------------------------------------------------------
# Mount APIRouters under /api/v1
# ------------------------------------------------------------------------------
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(faculty_router, prefix=settings.API_V1_STR)
app.include_router(student_router, prefix=settings.API_V1_STR)
