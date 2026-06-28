from datetime import datetime
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.usuario import Usuario
from app.models.cliente import Cliente
from app.models.venda import Venda

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class ClienteCreate(BaseModel):
    nome: str
    telefone: Optional[str] = None
    email: Optional[str] = None
    cpf: Optional[str] = None
    data_nascimento: Optional[str] = None
    observacao: Optional[str] = None


class ClienteRead(BaseModel):
    id: int
    nome: str
    telefone: Optional[str]
    email: Optional[str]
    cpf: Optional[str]
    data_nascimento: Optional[str]
    observacao: Optional[str]
    pontos_fidelidade: Decimal
    total_compras: int = 0
    total_gasto: Decimal = Decimal("0.00")

    model_config = {"from_attributes": True}


class PontosAjuste(BaseModel):
    pontos: Decimal
    motivo: Optional[str] = None


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ClienteRead])
async def listar_clientes(
    q: Optional[str] = Query(None, description="Busca por nome, CPF ou telefone"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    stmt = select(Cliente).where(Cliente.deleted_at.is_(None)).order_by(Cliente.nome)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            Cliente.nome.ilike(like)
            | Cliente.cpf.ilike(like)
            | Cliente.telefone.ilike(like)
        )
    result = await db.execute(stmt)
    clientes = result.scalars().all()

    out = []
    for c in clientes:
        vendas_result = await db.execute(
            select(func.count(Venda.id), func.coalesce(func.sum(Venda.total), 0))
            .where(Venda.cliente_id == c.id, Venda.status == "concluida")
        )
        total_compras, total_gasto = vendas_result.one()
        out.append(ClienteRead(
            id=c.id,
            nome=c.nome,
            telefone=c.telefone,
            email=c.email,
            cpf=c.cpf,
            data_nascimento=str(c.data_nascimento) if c.data_nascimento else None,
            observacao=c.observacao,
            pontos_fidelidade=c.pontos_fidelidade,
            total_compras=total_compras,
            total_gasto=Decimal(str(total_gasto)).quantize(Decimal("0.01")),
        ))
    return out


@router.post("", response_model=ClienteRead, status_code=201)
async def criar_cliente(
    payload: ClienteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if payload.cpf:
        existing = await db.execute(
            select(Cliente).where(Cliente.cpf == payload.cpf, Cliente.deleted_at.is_(None))
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="CPF já cadastrado")

    now = datetime.utcnow()
    cliente = Cliente(
        nome=payload.nome,
        telefone=payload.telefone,
        email=payload.email,
        cpf=payload.cpf or None,
        observacao=payload.observacao,
        pontos_fidelidade=Decimal("0.00"),
        created_at=now,
        updated_at=now,
    )
    if payload.data_nascimento:
        from datetime import date
        try:
            cliente.data_nascimento = date.fromisoformat(payload.data_nascimento)
        except ValueError:
            raise HTTPException(status_code=422, detail="data_nascimento inválida (use YYYY-MM-DD)")

    db.add(cliente)
    await db.commit()
    await db.refresh(cliente)
    return ClienteRead(
        id=cliente.id, nome=cliente.nome, telefone=cliente.telefone,
        email=cliente.email, cpf=cliente.cpf,
        data_nascimento=str(cliente.data_nascimento) if cliente.data_nascimento else None,
        observacao=cliente.observacao, pontos_fidelidade=cliente.pontos_fidelidade,
    )


@router.put("/{cliente_id}", response_model=ClienteRead)
async def atualizar_cliente(
    cliente_id: int,
    payload: ClienteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(
        select(Cliente).where(Cliente.id == cliente_id, Cliente.deleted_at.is_(None))
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    if payload.cpf and payload.cpf != cliente.cpf:
        dup = await db.execute(
            select(Cliente).where(Cliente.cpf == payload.cpf, Cliente.deleted_at.is_(None), Cliente.id != cliente_id)
        )
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="CPF já cadastrado em outro cliente")

    cliente.nome = payload.nome
    cliente.telefone = payload.telefone
    cliente.email = payload.email
    cliente.cpf = payload.cpf or None
    cliente.observacao = payload.observacao
    cliente.updated_at = datetime.utcnow()

    if payload.data_nascimento:
        from datetime import date
        try:
            cliente.data_nascimento = date.fromisoformat(payload.data_nascimento)
        except ValueError:
            raise HTTPException(status_code=422, detail="data_nascimento inválida (use YYYY-MM-DD)")
    else:
        cliente.data_nascimento = None

    await db.commit()
    await db.refresh(cliente)
    return ClienteRead(
        id=cliente.id, nome=cliente.nome, telefone=cliente.telefone,
        email=cliente.email, cpf=cliente.cpf,
        data_nascimento=str(cliente.data_nascimento) if cliente.data_nascimento else None,
        observacao=cliente.observacao, pontos_fidelidade=cliente.pontos_fidelidade,
    )


@router.delete("/{cliente_id}", status_code=204)
async def excluir_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    result = await db.execute(
        select(Cliente).where(Cliente.id == cliente_id, Cliente.deleted_at.is_(None))
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    cliente.deleted_at = datetime.utcnow()
    await db.commit()


@router.get("/{cliente_id}/historico")
async def historico_compras(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(
        select(Cliente).where(Cliente.id == cliente_id, Cliente.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    vendas_result = await db.execute(
        select(Venda)
        .options(selectinload(Venda.itens))
        .where(Venda.cliente_id == cliente_id, Venda.status == "concluida")
        .order_by(desc(Venda.created_at))
        .limit(50)
    )
    vendas = vendas_result.scalars().all()

    return [
        {
            "id": v.id,
            "uuid": v.uuid,
            "total": float(v.total),
            "desconto_valor": float(v.desconto_valor),
            "created_at": v.created_at.strftime("%Y-%m-%d %H:%M") if v.created_at else "",
            "qtd_itens": len(v.itens),
        }
        for v in vendas
    ]


@router.post("/{cliente_id}/pontos")
async def ajustar_pontos(
    cliente_id: int,
    payload: PontosAjuste,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    result = await db.execute(
        select(Cliente).where(Cliente.id == cliente_id, Cliente.deleted_at.is_(None))
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    cliente.pontos_fidelidade = (cliente.pontos_fidelidade + payload.pontos).quantize(Decimal("0.01"))
    if cliente.pontos_fidelidade < 0:
        cliente.pontos_fidelidade = Decimal("0.00")
    cliente.updated_at = datetime.utcnow()
    await db.commit()
    return {"pontos_fidelidade": cliente.pontos_fidelidade}
