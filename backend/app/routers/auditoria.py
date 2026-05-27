from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_admin_gerente
from app.models.usuario import Usuario
from app.models.auditoria import LogAuditoria

router = APIRouter()

_PERFIL_LABEL = {
    "admin":       "Administrador",
    "gerente":     "Gerente",
    "caixa":       "Operador(a) de Caixa",
    "estoquista":  "Estoquista",
    "super_admin": "Sistema",
}


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
    stmt = (
        select(LogAuditoria, Usuario.nome, Usuario.perfil)
        .outerjoin(Usuario, LogAuditoria.usuario_id == Usuario.id)
        .order_by(LogAuditoria.created_at.desc())
    )
    if entidade:
        stmt = stmt.where(LogAuditoria.entidade == entidade)
    if acao:
        stmt = stmt.where(LogAuditoria.acao == acao)
    if usuario_id:
        stmt = stmt.where(LogAuditoria.usuario_id == usuario_id)
    stmt = stmt.limit(limit).offset(offset)

    rows = (await db.execute(stmt)).all()

    result = []
    for log, nome, perfil in rows:
        # Hide super_admin identity
        if perfil == "super_admin":
            nome = None
            perfil = None
        result.append({
            "id":               log.id,
            "created_at":       log.created_at,
            "entidade":         log.entidade,
            "entidade_id":      log.entidade_id,
            "acao":             log.acao,
            "usuario_id":       log.usuario_id,
            "usuario_nome":     nome or "Sistema",
            "usuario_perfil":   _PERFIL_LABEL.get(perfil or "", "") if perfil else "",
            "ip_address":       log.ip_address,
            "dados_novos":      log.dados_novos,
            "dados_anteriores": log.dados_anteriores,
        })
    return result
