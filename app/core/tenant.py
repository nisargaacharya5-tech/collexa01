"""
Multi-Tenant Context Resolution.
Resolves the active tenant (College) from:
1. 'X-College-ID' / 'X-Tenant-Domain' / 'X-College-Code' HTTP headers
2. Host subdomain / domain (e.g. mit.colexa.edu -> code='mit')
3. Query param 'college_id' or 'college_code' (for development/testing convenience)
"""

import uuid
from typing import Optional
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import TenantNotFoundError
from app.models import College


def extract_tenant_identifier(request: Request) -> tuple[Optional[str], Optional[str]]:
    """
    Extracts (identifier_type, value) from the incoming request.
    Types: 'id', 'code', 'domain'
    """
    # 1. Header: X-College-ID (UUID)
    header_college_id = request.headers.get("X-College-ID") or request.headers.get("x-college-id")
    if header_college_id:
        return "id", header_college_id.strip()

    # 2. Header: X-College-Code
    header_college_code = request.headers.get("X-College-Code") or request.headers.get("x-college-code")
    if header_college_code:
        return "code", header_college_code.strip()

    # 3. Header: X-Tenant-Domain
    header_tenant_domain = request.headers.get("X-Tenant-Domain") or request.headers.get("x-tenant-domain")
    if header_tenant_domain:
        return "domain", header_tenant_domain.strip()

    # 4. Host header / Subdomain parsing
    host = request.headers.get("host", "").split(":")[0].lower()
    base_domain = settings.BASE_DOMAIN.lower()

    if host and host not in ("localhost", "127.0.0.1", "testserver", "backend"):
        if host.endswith(f".{base_domain}"):
            subdomain = host[: -len(f".{base_domain}")]
            if subdomain and subdomain not in ("api", "www", ""):
                return "code", subdomain
        elif "." in host:
            # Check for custom domain match (e.g. portal.mit.edu)
            return "domain", host

    # 5. Query parameters fallback for manual testing
    query_college_id = request.query_params.get("college_id")
    if query_college_id:
        return "id", query_college_id.strip()

    query_college_code = request.query_params.get("college_code")
    if query_college_code:
        return "code", query_college_code.strip()

    return None, None


def resolve_tenant_college(db: Session, request: Request, required: bool = True) -> Optional[College]:
    """
    Resolves the College model from the database based on request headers/host.
    """
    id_type, val = extract_tenant_identifier(request)

    if not val:
        if required:
            raise TenantNotFoundError(
                "Tenant college identification missing. Provide 'X-College-ID' header, "
                "subdomain ({code}.colexa.edu), or valid tenant credentials."
            )
        return None

    query = select(College).where(College.status == "ACTIVE")

    if id_type == "id":
        try:
            college_uuid = uuid.UUID(val)
            query = query.where(College.id == college_uuid)
        except ValueError:
            if required:
                raise TenantNotFoundError(f"Invalid UUID for college_id: '{val}'")
            return None
    elif id_type == "code":
        query = query.where(College.code == val)
    elif id_type == "domain":
        query = query.where((College.domain == val) | (College.code == val))

    college = db.scalar(query)
    if not college and required:
        raise TenantNotFoundError(f"Active college matching '{val}' was not found.")

    return college
