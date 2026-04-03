from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user, require_estoque
from app.models.usuario import Usuario
from app.models.produto import Categoria
from app.schemas.produto import CategoriaCreate, CategoriaRead

router = APIRouter()


@router.get("", response_model=list[CategoriaRead])
async def listar(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    result = await db.execute(select(Categoria).where(Categoria.ativo == True).order_by(Categoria.nome))
    return result.scalars().all()


@router.post("", response_model=CategoriaRead, status_code=201)
async def criar(payload: CategoriaCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_estoque)):
    now = datetime.utcnow()
    cat = Categoria(nome=payload.nome, descricao=payload.descricao, created_at=now, updated_at=now)
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


@router.delete("/{categoria_id}", status_code=204)
async def deletar(categoria_id: int, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_estoque)):
    result = await db.execute(select(Categoria).where(Categoria.id == categoria_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    cat.ativo = False
    await db.commit()
