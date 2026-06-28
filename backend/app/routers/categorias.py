from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user, require_estoque
from app.models.usuario import Usuario
from app.models.produto import Categoria, Produto
from app.schemas.produto import CategoriaCreate, CategoriaRead, CategoriaUpdate

router = APIRouter()


async def _validar_parent(db: AsyncSession, categoria_id: int | None, parent_id: int | None) -> None:
    """Garante que parent existe, é ativo e não cria ciclo."""
    if parent_id is None:
        return
    if categoria_id is not None and parent_id == categoria_id:
        raise HTTPException(status_code=400, detail="Categoria não pode ser pai de si mesma")
    r = await db.execute(select(Categoria).where(Categoria.id == parent_id))
    parent = r.scalar_one_or_none()
    if not parent or not parent.ativo:
        raise HTTPException(status_code=400, detail="Categoria pai inválida")
    # Sobe a cadeia para detectar ciclo
    visitado = parent
    while visitado and visitado.parent_id is not None:
        if categoria_id is not None and visitado.parent_id == categoria_id:
            raise HTTPException(status_code=400, detail="Hierarquia inválida (ciclo detectado)")
        r = await db.execute(select(Categoria).where(Categoria.id == visitado.parent_id))
        visitado = r.scalar_one_or_none()


@router.get("", response_model=list[CategoriaRead])
async def listar(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    result = await db.execute(select(Categoria).where(Categoria.ativo == True).order_by(Categoria.nome))
    return result.scalars().all()


@router.post("", response_model=CategoriaRead, status_code=201)
async def criar(payload: CategoriaCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_estoque)):
    await _validar_parent(db, None, payload.parent_id)
    now = datetime.utcnow()
    cat = Categoria(
        nome=payload.nome,
        descricao=payload.descricao,
        parent_id=payload.parent_id,
        created_at=now,
        updated_at=now,
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


@router.patch("/{categoria_id}", response_model=CategoriaRead)
async def atualizar(
    categoria_id: int,
    payload: CategoriaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_estoque),
):
    r = await db.execute(select(Categoria).where(Categoria.id == categoria_id))
    cat = r.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    if payload.nome is not None:
        cat.nome = payload.nome
    if payload.descricao is not None:
        cat.descricao = payload.descricao
    if "parent_id" in payload.model_fields_set:
        await _validar_parent(db, categoria_id, payload.parent_id)
        cat.parent_id = payload.parent_id

    cat.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(cat)
    return cat


@router.delete("/{categoria_id}", status_code=204)
async def deletar(categoria_id: int, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_estoque)):
    result = await db.execute(select(Categoria).where(Categoria.id == categoria_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    filhos = await db.execute(
        select(func.count(Categoria.id)).where(Categoria.parent_id == categoria_id, Categoria.ativo == True)
    )
    if filhos.scalar_one() > 0:
        raise HTTPException(status_code=400, detail="Remova ou mova as subcategorias antes de excluir esta")

    cat.ativo = False
    cat.updated_at = datetime.utcnow()
    await db.commit()
