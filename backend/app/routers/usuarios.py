from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.usuario import Usuario
from app.utils.security import hash_password

router = APIRouter()


class UsuarioCreate(BaseModel):
    nome: str
    email: str
    senha: str
    perfil: str = "caixa"


class UsuarioRead(BaseModel):
    id: int
    uuid: str
    nome: str
    email: str
    perfil: str
    ativo: bool
    model_config = {"from_attributes": True}


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    perfil: Optional[str] = None
    ativo: Optional[bool] = None
    nova_senha: Optional[str] = None


@router.get("", response_model=list[UsuarioRead])
async def listar(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    result = await db.execute(select(Usuario).where(Usuario.deleted_at == None).order_by(Usuario.nome))
    return result.scalars().all()


@router.post("", response_model=UsuarioRead, status_code=201)
async def criar(
    payload: UsuarioCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    now = datetime.utcnow()
    usuario = Usuario(
        uuid=str(uuid.uuid4()),
        nome=payload.nome,
        email=payload.email,
        senha_hash=hash_password(payload.senha),
        perfil=payload.perfil,
        ativo=True,
        created_at=now,
        updated_at=now,
    )
    db.add(usuario)
    await db.commit()
    await db.refresh(usuario)
    return usuario


@router.put("/{usuario_id}", response_model=UsuarioRead)
async def atualizar(
    usuario_id: int,
    payload: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    for field, value in payload.model_dump(exclude_unset=True, exclude={"nova_senha"}).items():
        setattr(usuario, field, value)
    if payload.nova_senha:
        usuario.senha_hash = hash_password(payload.nova_senha)
    usuario.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(usuario)
    return usuario


@router.delete("/{usuario_id}", status_code=204)
async def remover(
    usuario_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    if current_user.id == usuario_id:
        raise HTTPException(status_code=400, detail="Não é possível excluir o próprio usuário")
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    usuario.deleted_at = datetime.utcnow()
    usuario.updated_at = datetime.utcnow()
    await db.commit()
