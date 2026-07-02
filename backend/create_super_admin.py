import asyncio
import getpass
import os
import sys
import uuid
from datetime import datetime
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.usuario import Usuario
from app.utils.security import hash_password


def _read_credentials() -> tuple[str, str, str]:
    """E-mail/senha vêm de env var (uso não-interativo/CI) ou são pedidos no
    prompt (uso manual). Nunca hardcoded — isso já vazou senha real de
    super_admin em texto puro no histórico do git antes."""
    email = os.environ.get("SUPER_ADMIN_EMAIL") or input("E-mail do super admin: ").strip()
    senha = os.environ.get("SUPER_ADMIN_SENHA") or getpass.getpass("Senha do super admin: ")
    nome = os.environ.get("SUPER_ADMIN_NOME") or "Super Admin"

    if not email or not senha:
        print("ERRO: e-mail e senha são obrigatórios.", file=sys.stderr)
        sys.exit(1)
    if len(senha) < 8:
        print("ERRO: senha muito curta (mínimo 8 caracteres).", file=sys.stderr)
        sys.exit(1)

    return email, senha, nome


async def create_super_admin():
    email, senha, nome = _read_credentials()

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Usuario).where(Usuario.email == email))
        user = result.scalar_one_or_none()

        if user:
            print(f"Usuário {email} já existe. Atualizando para super_admin...")
            user.perfil = "super_admin"
            user.senha_hash = hash_password(senha)
            user.ativo = True
        else:
            print(f"Criando novo super_admin: {email}")
            db.add(Usuario(
                uuid=str(uuid.uuid4()),
                nome=nome,
                email=email,
                senha_hash=hash_password(senha),
                perfil="super_admin",
                ativo=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ))

        await db.commit()
    print("DONE: Super Admin garantido.")

if __name__ == "__main__":
    asyncio.run(create_super_admin())
