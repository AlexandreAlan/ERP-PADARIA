"""
Inicialização LIMPA do banco (produção / nova cópia de cliente).

Diferente do seed_dev.py, este script:
  - NÃO apaga dados (sem drop_all);
  - NÃO cria produtos/fornecedores fictícios;
  - cria apenas o mínimo para operar: tabelas, 1 usuário admin,
    a configuração da empresa (branding) e 1 caixa padrão.

É idempotente: rodar de novo não duplica nada.

Variáveis lidas do ambiente (.env do cliente):
  ADMIN_EMAIL     (default: admin@padaria.com)
  ADMIN_PASSWORD  (default: Admin@1234)
  ADMIN_NOME      (default: Administrador)
  PADARIA_NOME / PADARIA_* -> branding da empresa (via Settings)

Execute:  python init_db.py
"""
import asyncio
import os
import uuid
from datetime import datetime

from sqlalchemy import select

from app.database import engine, Base, AsyncSessionLocal
from app.models import *  # noqa — registra todos os modelos no metadata
from app.utils.security import hash_password
from app.config import get_settings


async def main() -> None:
    settings = get_settings()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("OK tabelas garantidas")

    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()

        # 1. Usuário admin (só se ainda não houver nenhum usuário)
        existe_usuario = (await db.execute(select(Usuario).limit(1))).scalar_one_or_none()
        if existe_usuario:
            print("-- já existem usuários; admin não recriado")
        else:
            email = os.getenv("ADMIN_EMAIL", "admin@padaria.com")
            senha = os.getenv("ADMIN_PASSWORD", "Admin@1234")
            nome = os.getenv("ADMIN_NOME", "Administrador")
            db.add(Usuario(
                uuid=str(uuid.uuid4()), nome=nome, email=email,
                senha_hash=hash_password(senha), perfil="admin", ativo=True,
                created_at=now, updated_at=now,
            ))
            print(f"OK admin criado: {email}")

        # 2. Configuração da empresa (singleton id=1) com o branding do .env
        empresa = (await db.execute(
            select(ConfiguracaoEmpresa).where(ConfiguracaoEmpresa.id == 1)
        )).scalar_one_or_none()
        if empresa:
            print("-- configuração de empresa já existe")
        else:
            db.add(ConfiguracaoEmpresa(
                id=1,
                nome=settings.padaria_nome,
                cnpj=settings.padaria_cnpj or None,
                telefone=settings.padaria_telefone or None,
                endereco=settings.padaria_endereco or None,
                cidade=settings.padaria_cidade or None,
                mensagem_rodape=settings.padaria_mensagem_rodape,
                created_at=now, updated_at=now,
            ))
            print(f"OK empresa: {settings.padaria_nome}")

        # 3. Caixa padrão (só se não houver nenhum)
        existe_caixa = (await db.execute(select(Caixa).limit(1))).scalar_one_or_none()
        if existe_caixa:
            print("-- já existe caixa")
        else:
            db.add(Caixa(nome="Caixa 01", descricao="Caixa principal", ativo=True,
                         created_at=now, updated_at=now))
            print("OK caixa padrão criado")

        await db.commit()

    print("\nDONE init concluído (banco limpo, pronto para uso).")


if __name__ == "__main__":
    asyncio.run(main())
