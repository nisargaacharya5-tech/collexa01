"""
API Routers Package
"""

from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.faculty import router as faculty_router
from app.routers.student import router as student_router

__all__ = [
    "auth_router",
    "admin_router",
    "faculty_router",
    "student_router",
]
