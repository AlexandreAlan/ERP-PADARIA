from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_admin_gerente
from app.models.usuario import Usuario
from app.models.auditoria import LogAuditoria

router = APIRouter()


@router.get("")
async def listar_logs(
    entidade: Optional[str] = None,
    acao: Optional[str] = None,
    usuario_id: Optional[int] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin_gerente),
):
    stmt = select(LogAuditoria).order_by(LogAuditoria.created_at.desc())
    if entidade:
        stmt = stmt.where(LogAuditoria.entidade == entidade)
    if acao:
        stmt = stmt.where(LogAuditoria.acao == acao)
    if usuario_id:
        stmt = stmt.where(LogAuditoria.usuario_id == usuario_id)
    stmt = stmt.limit(limit).offset(offset)

    result = await db.execute(stmt)
    return result.scalars().all()
