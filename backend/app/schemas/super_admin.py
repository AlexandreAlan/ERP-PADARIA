from pydantic import BaseModel
from typing import List, Optional

class TenantInfo(BaseModel):
    slug: str
    domain: Optional[str] = None
    name: Optional[str] = None
    port: Optional[int] = None
    status: str = "active"

class SuperAdminDashboard(BaseModel):
    tenants: List[TenantInfo]
    total_tenants: int
