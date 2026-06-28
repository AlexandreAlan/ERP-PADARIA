from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.usuario import Usuario
from app.models.auditoria import LogAuditoria
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest
from app.utils.security import verify_password, create_access_token, create_refresh_token, decode_token

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Usuario).where(Usuario.email == payload.email, Usuario.ativo.is_(True))
    )
    usuario = result.scalar_one_or_none()

    if not usuario or not verify_password(payload.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
        )

    access = create_access_token(usuario.id, usuario.perfil)
    refresh = create_refresh_token(usuario.id)

    # Audit log
    from datetime import datetime
    db.add(LogAuditoria(
        usuario_id=usuario.id,
        entidade="usuario",
        entidade_id=str(usuario.id),
        acao="login",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        created_at=datetime.utcnow(),
    ))
    await db.commit()

    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        usuario_id=usuario.id,
        usuario_nome=usuario.nome,
        perfil=usuario.perfil,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    token_data = decode_token(payload.refresh_token, expected_type="refresh")
    usuario_id = int(token_data["sub"])

    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id, Usuario.ativo.is_(True)))
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inativo")

    return TokenResponse(
        access_token=create_access_token(usuario.id, usuario.perfil),
        refresh_token=create_refresh_token(usuario.id),
        usuario_id=usuario.id,
        usuario_nome=usuario.nome,
        perfil=usuario.perfil,
    )
