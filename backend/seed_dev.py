"""
Script de seed para desenvolvimento (SQLite).
Cria as tabelas e popula com dados iniciais.
Execute: python seed_dev.py
"""
import asyncio
import uuid
from datetime import datetime
from decimal import Decimal

from app.database import engine, Base, AsyncSessionLocal
from app.models import *  # noqa — carrega todos os modelos
from app.utils.security import hash_password


async def criar_tabelas():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("OK Tabelas criadas")


async def seed():
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()

        # Categorias
        cats = [
            Categoria(nome="Pães",     descricao="Pães e panificados",    ativo=True, created_at=now, updated_at=now),
            Categoria(nome="Bolos",    descricao="Bolos e tortas",         ativo=True, created_at=now, updated_at=now),
            Categoria(nome="Salgados", descricao="Salgados assados/fritos",ativo=True, created_at=now, updated_at=now),
            Categoria(nome="Bebidas",  descricao="Bebidas frias e quentes",ativo=True, created_at=now, updated_at=now),
            Categoria(nome="Doces",    descricao="Doces e confeitaria",    ativo=True, created_at=now, updated_at=now),
            Categoria(nome="Frios",    descricao="Frios e laticínios",     ativo=True, created_at=now, updated_at=now),
            Categoria(nome="Outros",   descricao="Demais produtos",        ativo=True, created_at=now, updated_at=now),
        ]
        for c in cats:
            db.add(c)
        await db.flush()
        print(f"OK {len(cats)} categorias criadas")

        # Fornecedores
        forns = [
            Fornecedor(razao_social="Distribuidora Farinha & Cia", cnpj="12.345.678/0001-90",
                       telefone="(11) 99999-1111", ativo=True, created_at=now, updated_at=now),
            Fornecedor(razao_social="Bebidas Norte Sul Ltda", cnpj="98.765.432/0001-10",
                       ativo=True, created_at=now, updated_at=now),
            Fornecedor(razao_social="Laticínios do Vale", cnpj="11.222.333/0001-44",
                       ativo=True, created_at=now, updated_at=now),
        ]
        for f in forns:
            db.add(f)
        await db.flush()

        # Usuários
        usuarios_data = [
            ("Administrador", "admin@padaria.com",  "admin"),
            ("Operador Caixa","caixa@padaria.com",  "caixa"),
            ("Estoquista",    "estoque@padaria.com","estoquista"),
        ]
        for nome, email, perfil in usuarios_data:
            db.add(Usuario(
                uuid=str(uuid.uuid4()), nome=nome, email=email,
                senha_hash=hash_password("Admin@1234"),
                perfil=perfil, ativo=True, created_at=now, updated_at=now,
            ))
        await db.flush()
        print("OK 3 usuários criados (senha: Admin@1234)")

        # Caixas
        db.add(Caixa(nome="Caixa 01", descricao="Caixa principal", ativo=True, created_at=now, updated_at=now))
        db.add(Caixa(nome="Caixa 02", descricao="Caixa secundário", ativo=True, created_at=now, updated_at=now))
        await db.flush()

        # Produtos
        produtos_data = [
            ("7891000315507","PAO-FRANCES",  "Pão Francês (unidade)",      1, 1, "un",  0.25,  0.60, 200, 50),
            ("7891000315514","PAO-FORMA",    "Pão de Forma 500g",           1, 1, "un",  3.50,  6.99,  30,  5),
            ("7891000315521","PAO-INTEGRAL", "Pão Integral 400g",           1, 1, "un",  4.20,  8.50,  20,  5),
            ("7891000315528","BOLO-CENOURA", "Bolo de Cenoura (fatia)",     2, 1, "un",  2.00,  4.50,  15,  3),
            ("7891000315535","BOLO-CHOCO",   "Bolo de Chocolate (fatia)",   2, 1, "un",  2.20,  5.00,  15,  3),
            ("7891000315542","COXINHA",      "Coxinha de Frango",           3, 1, "un",  1.50,  3.50,  40, 10),
            ("7891000315549","ENROLADO",     "Enrolado de Salsicha",        3, 1, "un",  1.20,  3.00,  40, 10),
            ("7891000315556","CAFE-P",       "Café Coado (copo pequeno)",   4, None,"un",0.30,  2.00,   0,  0),
            ("7891000315563","CAFE-G",       "Café Coado (copo grande)",    4, None,"un",0.40,  3.00,   0,  0),
            ("7891000315570","SUCO-LAR",     "Suco de Laranja 300ml",       4, None,"un",1.80,  4.50,  10,  3),
            ("7891000315577","REFRIGERANTE", "Refrigerante Lata 350ml",     4, 2,   "un",2.50,  5.00,  24,  6),
            ("7891000315584","DOCE-LEITE",   "Doce de Leite 200g",          5, 3,   "un",4.00,  8.00,   2,  3),  # estoque baixo para demo
            ("7891000315591","QUEIJO-MINAS", "Queijo Minas Frescal 400g",   6, 3,   "un",7.50, 14.90,  10,  3),
            ("7891000315598","MANTEIGA",     "Manteiga com Sal 200g",       6, 3,   "un",5.00,  9.90,  15,  5),
        ]
        for row in produtos_data:
            barcode, sku, nome, cat_id, forn_id, unidade, custo, venda, estoque, minimo = row
            db.add(Produto(
                codigo_barras=barcode, sku=sku, nome=nome,
                categoria_id=cat_id, fornecedor_id=forn_id,
                unidade_medida=unidade,
                preco_custo=Decimal(str(custo)),
                preco_venda=Decimal(str(venda)),
                estoque_atual=Decimal(str(estoque)),
                estoque_minimo=Decimal(str(minimo)),
                ativo=True, created_at=now, updated_at=now,
            ))
        print(f"OK {len(produtos_data)} produtos criados")

        await db.commit()
        print("\nDONE Seed concluído! Acesse http://localhost:8000/api/docs")
        print("   Login: admin@padaria.com / Admin@1234")


async def main():
    await criar_tabelas()
    await seed()


if __name__ == "__main__":
    asyncio.run(main())
