from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.usuario import Usuario
from app.utils.security import decode_token

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    payload = decode_token(credentials.credentials, expected_type="access")
    usuario_id = int(payload["sub"])

    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id, Usuario.ativo.is_(True)))
    usuario = result.scalar_one_or_none()

    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado ou inativo")

    return usuario


def require_perfis(*perfis: str):
    async def checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        # Super admin has access to everything
        if current_user.perfil == "super_admin":
            return current_user
            
        if current_user.perfil not in perfis:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão negada. Perfil necessário: {', '.join(perfis)}",
            )
        return current_user
    return checker


require_super_admin = require_perfis("super_admin")
require_admin = require_perfis("admin")
require_admin_gerente = require_perfis("admin", "gerente")
require_caixa = require_perfis("admin", "gerente", "caixa")
require_estoque = require_perfis("admin", "gerente", "estoquista")
