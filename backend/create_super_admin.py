import asyncio
import uuid
from datetime import datetime
from sqlalchemy import select
from app.database import engine, AsyncSessionLocal
from app.models.usuario import Usuario
from app.utils.security import hash_password

async def create_super_admin():
    email = "alexandre.basto444@gmail.com"
    senha = "88065438"
    nome = "Alexandre Basto (Super Admin)"
    
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
