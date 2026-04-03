from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user, require_caixa
from app.models.usuario import Usuario
from app.models.caixa import SessaoCaixa, Caixa
from app.schemas.caixa import (
    AberturaCaixaRequest, FechamentoCaixaRequest,
    SangriaRequest, SuprimentoRequest,
    SessaoCaixaRead, MovimentacaoCaixaRead,
    ResumoFechamentoCaixa,
)
from app.services import caixa_service

router = APIRouter()


@router.get("/caixas")
async def listar_caixas(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Caixa).where(Caixa.ativo == True).order_by(Caixa.nome))
    return result.scalars().all()


@router.post("/abrir", response_model=SessaoCaixaRead, status_code=201)
async def abrir_caixa(
    payload: AberturaCaixaRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_caixa),
):
    sessao = await caixa_service.abrir_caixa(payload, current_user.id, db)
    return await _to_sessao_read(sessao, db)


@router.post("/{sessao_id}/fechar", response_model=ResumoFechamentoCaixa)
async def fechar_caixa(
    sessao_id: int,
    payload: FechamentoCaixaRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_caixa),
):
    return await caixa_service.fechar_caixa(sessao_id, payload, current_user.id, db)


@router.post("/{sessao_id}/sangria", response_model=MovimentacaoCaixaRead, status_code=201)
async def sangria(
    sessao_id: int,
    payload: SangriaRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_caixa),
):
    mov = await caixa_service.registrar_sangria(sessao_id, payload, current_user.id, db)
    return _to_mov_read(mov, current_user.nome)


@router.post("/{sessao_id}/suprimento", response_model=MovimentacaoCaixaRead, status_code=201)
async def suprimento(
    sessao_id: int,
    payload: SuprimentoRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_caixa),
):
    mov = await caixa_service.registrar_suprimento(sessao_id, payload, current_user.id, db)
    return _to_mov_read(mov, current_user.nome)


@router.get("/sessao-ativa", response_model=SessaoCaixaRead | None)
async def sessao_ativa(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    sessao = await caixa_service.get_sessao_ativa(current_user.id, db)
    if not sessao:
        return None
    return await _to_sessao_read(sessao, db)


# ── Helpers ─────────────────────────────────────────────────────────────────────

async def _to_sessao_read(sessao: SessaoCaixa, db: AsyncSession) -> SessaoCaixaRead:
    caixa_result = await db.execute(select(Caixa).where(Caixa.id == sessao.caixa_id))
    caixa = caixa_result.scalar_one_or_none()
    user_result = await db.execute(select(Usuario).where(Usuario.id == sessao.usuario_id))
    usuario = user_result.scalar_one_or_none()

    return SessaoCaixaRead(
        id=sessao.id,
        caixa_id=sessao.caixa_id,
        caixa_nome=caixa.nome if caixa else "",
        usuario_id=sessao.usuario_id,
        usuario_nome=usuario.nome if usuario else "",
        status=sessao.status,
        valor_abertura=sessao.valor_abertura,
        valor_fechamento=sessao.valor_fechamento,
        total_vendas=sessao.total_vendas,
        total_sangrias=sessao.total_sangrias,
        total_suprimentos=sessao.total_suprimentos,
        diferenca=sessao.diferenca,
        observacao=sessao.observacao,
        opened_at=sessao.opened_at,
        closed_at=sessao.closed_at,
    )


def _to_mov_read(mov, usuario_nome: str) -> MovimentacaoCaixaRead:
    return MovimentacaoCaixaRead(
        id=mov.id,
        sessao_id=mov.sessao_id,
        tipo=mov.tipo,
        valor=mov.valor,
        motivo=mov.motivo,
        usuario_nome=usuario_nome,
        created_at=mov.created_at,
    )
