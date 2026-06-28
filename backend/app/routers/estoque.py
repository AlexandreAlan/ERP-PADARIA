from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from decimal import Decimal

from app.database import get_db
from app.dependencies.auth import get_current_user, require_estoque
from app.models.usuario import Usuario
from app.models.produto import Produto
from app.models.estoque import MovimentacaoEstoque

router = APIRouter()


class AjusteEstoqueRequest(BaseModel):
    produto_id: int
    tipo: str              # entrada | saida | ajuste | perda | devolucao
    quantidade: Decimal
    custo_unit: Optional[Decimal] = None
    observacao: Optional[str] = None


@router.get("/alertas")
async def alertas_estoque(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(
        select(Produto).where(
            Produto.ativo.is_(True),
            Produto.estoque_minimo > 0,
            Produto.estoque_atual <= Produto.estoque_minimo,
        ).order_by(Produto.estoque_atual)
    )
    return [
        {
            "produto_id": p.id,
            "nome": p.nome,
            "estoque_atual": p.estoque_atual,
            "estoque_minimo": p.estoque_minimo,
            "unidade_medida": p.unidade_medida,
            "urgente": p.estoque_atual <= 0,
        }
        for p in result.scalars().all()
    ]


@router.post("/ajuste", status_code=201)
async def ajuste_estoque(
    payload: AjusteEstoqueRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_estoque),
):
    tipos_validos = {"entrada", "saida", "ajuste", "perda", "devolucao"}
    if payload.tipo not in tipos_validos:
        raise HTTPException(status_code=422, detail=f"Tipo inválido. Use: {tipos_validos}")

    result = await db.execute(
        select(Produto).where(Produto.id == payload.produto_id, Produto.ativo.is_(True))
    )
    produto = result.scalar_one_or_none()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    saldo_antes = produto.estoque_atual

    if payload.tipo in {"saida", "perda"}:
        if saldo_antes < payload.quantidade:
            raise HTTPException(status_code=422, detail="Estoque insuficiente para esta operação")
        saldo_depois = saldo_antes - payload.quantidade
    elif payload.tipo == "ajuste":
        saldo_depois = payload.quantidade
    else:
        saldo_depois = saldo_antes + payload.quantidade

    now = datetime.utcnow()
    produto.estoque_atual = saldo_depois
    produto.updated_at = now

    mov = MovimentacaoEstoque(
        produto_id=produto.id,
        tipo=payload.tipo,
        quantidade=payload.quantidade if payload.tipo != "ajuste" else abs(saldo_depois - saldo_antes),
        saldo_antes=saldo_antes,
        saldo_depois=saldo_depois,
        custo_unit=payload.custo_unit,
        referencia_tipo="ajuste_manual",
        usuario_id=current_user.id,
        observacao=payload.observacao,
        created_at=now,
    )
    db.add(mov)
    await db.flush()

    return {"mensagem": "Estoque ajustado com sucesso", "saldo_atual": saldo_depois}


@router.get("/movimentacoes")
async def movimentacoes(
    produto_id: Optional[int] = None,
    tipo: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    stmt = select(MovimentacaoEstoque).order_by(MovimentacaoEstoque.created_at.desc())
    if produto_id:
        stmt = stmt.where(MovimentacaoEstoque.produto_id == produto_id)
    if tipo:
        stmt = stmt.where(MovimentacaoEstoque.tipo == tipo)
    stmt = stmt.limit(limit).offset(offset)

    result = await db.execute(stmt)
    movs = result.scalars().all()

    return [
        {
            "id": m.id,
            "produto_id": m.produto_id,
            "tipo": m.tipo,
            "quantidade": m.quantidade,
            "saldo_antes": m.saldo_antes,
            "saldo_depois": m.saldo_depois,
            "custo_unit": m.custo_unit,
            "referencia_tipo": m.referencia_tipo,
            "referencia_id": m.referencia_id,
            "observacao": m.observacao,
            "created_at": m.created_at,
        }
        for m in movs
    ]
