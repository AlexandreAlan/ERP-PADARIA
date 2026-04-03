from datetime import datetime
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_estoque
from app.models.usuario import Usuario
from app.models.compra import Compra, ItemCompra
from app.models.produto import Produto
from app.models.estoque import MovimentacaoEstoque

router = APIRouter()


class ItemCompraIn(BaseModel):
    produto_id: int
    quantidade: Decimal
    custo_unit: Decimal


class CompraCreate(BaseModel):
    fornecedor_id: int
    itens: list[ItemCompraIn]
    nota_fiscal: Optional[str] = None
    data_entrega: Optional[str] = None


@router.post("", status_code=201)
async def criar_compra(
    payload: CompraCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_estoque),
):
    now = datetime.utcnow()
    total = sum(i.quantidade * i.custo_unit for i in payload.itens)

    compra = Compra(
        fornecedor_id=payload.fornecedor_id,
        usuario_id=current_user.id,
        status="confirmado",
        total=total.quantize(Decimal("0.01")),
        nota_fiscal=payload.nota_fiscal,
        created_at=now,
        updated_at=now,
    )
    db.add(compra)
    await db.flush()

    for item_in in payload.itens:
        item = ItemCompra(
            compra_id=compra.id,
            produto_id=item_in.produto_id,
            quantidade=item_in.quantidade,
            custo_unit=item_in.custo_unit,
            total_item=(item_in.quantidade * item_in.custo_unit).quantize(Decimal("0.01")),
        )
        db.add(item)

    await db.commit()
    await db.refresh(compra)
    return {"id": compra.id, "status": compra.status, "total": compra.total}


@router.post("/{compra_id}/receber")
async def receber_compra(
    compra_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_estoque),
):
    """Confirma recebimento: entra estoque e atualiza custo dos produtos."""
    result = await db.execute(
        select(Compra).where(Compra.id == compra_id, Compra.status == "confirmado")
    )
    compra = result.scalar_one_or_none()
    if not compra:
        raise HTTPException(status_code=404, detail="Compra confirmada não encontrada")

    itens_result = await db.execute(select(ItemCompra).where(ItemCompra.compra_id == compra_id))
    itens = itens_result.scalars().all()

    now = datetime.utcnow()
    for item in itens:
        prod_result = await db.execute(
            select(Produto).where(Produto.id == item.produto_id)
        )
        produto = prod_result.scalar_one()
        saldo_antes = produto.estoque_atual
        saldo_depois = saldo_antes + item.quantidade

        produto.estoque_atual = saldo_depois
        produto.preco_custo = item.custo_unit
        produto.updated_at = now

        db.add(MovimentacaoEstoque(
            produto_id=produto.id,
            tipo="entrada",
            quantidade=item.quantidade,
            saldo_antes=saldo_antes,
            saldo_depois=saldo_depois,
            custo_unit=item.custo_unit,
            referencia_id=compra.id,
            referencia_tipo="compra",
            usuario_id=current_user.id,
            created_at=now,
        ))

    compra.status = "recebido"
    compra.updated_at = now
    await db.flush()

    return {"mensagem": "Compra recebida e estoque atualizado"}
