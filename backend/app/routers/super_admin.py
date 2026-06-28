import os
import glob
from fastapi import APIRouter, Depends
from app.dependencies.auth import require_super_admin
from app.schemas.super_admin import SuperAdminDashboard, TenantInfo

router = APIRouter()

def parse_env_file(file_path):
    """Simple parser for tenant .env files."""
    data = {}
    try:
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    data[key.strip()] = value.strip().strip('"').strip("'")
    except Exception:
        pass
    return data

@router.get("/dashboard", response_model=SuperAdminDashboard)
async def get_super_admin_dashboard(current_user=Depends(require_super_admin)):
    """
    Lists all active tenants by scanning the deploy/clients directory.
    Only accessible by super_admin.
    """
    # Directory mounted via docker-compose
    clients_dir = "/app/deploy/clients"
    
    if not os.path.exists(clients_dir):
        # Fallback for local development outside docker
        clients_dir = os.path.join(os.getcwd(), "deploy", "clients")
        if not os.path.exists(clients_dir):
             return SuperAdminDashboard(tenants=[], total_tenants=0)

    tenants = []
    # Scan for all .env files EXCEPT example.env
    env_files = glob.glob(os.path.join(clients_dir, "*.env"))
    
    for env_file in env_files:
        filename = os.path.basename(env_file)
        if filename == "example.env":
            continue
            
        env_data = parse_env_file(env_file)
        slug = env_data.get("TENANT_SLUG") or filename.replace(".env", "")
        
        tenants.append(TenantInfo(
            slug=slug,
            domain=env_data.get("DOMAIN") or "local",
            name=env_data.get("PADARIA_NOME") or slug.capitalize(),
            port=int(env_data.get("BACKEND_PORT")) if env_data.get("BACKEND_PORT") else None,
            status="active"
        ))

    return SuperAdminDashboard(
        tenants=tenants,
        total_tenants=len(tenants)
    )
