from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user, require_estoque
from app.models.usuario import Usuario
from app.models.produto import Fornecedor
from app.schemas.produto import FornecedorCreate, FornecedorRead

router = APIRouter()


@router.get("", response_model=list[FornecedorRead])
async def listar(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    result = await db.execute(select(Fornecedor).where(Fornecedor.ativo == True).order_by(Fornecedor.razao_social))
    return result.scalars().all()


@router.post("", response_model=FornecedorRead, status_code=201)
async def criar(payload: FornecedorCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_estoque)):
    now = datetime.utcnow()
    f = Fornecedor(**payload.model_dump(), ativo=True, created_at=now, updated_at=now)
    db.add(f)
    await db.commit()
    await db.refresh(f)
    return f


@router.put("/{forn_id}", response_model=FornecedorRead)
async def atualizar(forn_id: int, payload: FornecedorCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_estoque)):
    result = await db.execute(select(Fornecedor).where(Fornecedor.id == forn_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(f, k, v)
    f.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(f)
    return f
