from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.usuario import Usuario
from app.schemas.dashboard import DashboardResponse
from app.services import dashboard_service

router = APIRouter()


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    data_inicio: date = Query(..., description="Data início YYYY-MM-DD"),
    data_fim: date = Query(..., description="Data fim YYYY-MM-DD"),
    caixa_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await dashboard_service.get_dashboard(data_inicio, data_fim, db, caixa_id)


@router.get("/alertas-estoque")
async def alertas_estoque(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await dashboard_service.alertas_estoque(db)
