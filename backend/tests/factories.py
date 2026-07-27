"""Fábricas mínimas de dados pros testes (usuário, sessão de caixa, produto)."""

import uuid as _uuid
from decimal import Decimal

from app.models.usuario import Usuario
from app.models.caixa import Caixa, SessaoCaixa
from app.models.produto import Categoria, Produto


async def criar_usuario(db, perfil: str = "caixa") -> Usuario:
    u = Usuario(
        uuid=str(_uuid.uuid4()),
        nome="Operador Teste",
        email=f"{_uuid.uuid4().hex}@teste.local",
        senha_hash="hash-fake",
        perfil=perfil,
    )
    db.add(u)
    await db.flush()
    return u


async def criar_sessao(db, usuario_id: int, valor_abertura: str = "0.00", status: str = "aberto") -> SessaoCaixa:
    caixa = Caixa(nome=f"Caixa {_uuid.uuid4().hex[:8]}")
    db.add(caixa)
    await db.flush()
    sessao = SessaoCaixa(
        caixa_id=caixa.id,
        usuario_id=usuario_id,
        status=status,
        valor_abertura=Decimal(valor_abertura),
    )
    db.add(sessao)
    await db.flush()
    return sessao


async def criar_produto(
    db,
    preco_venda: str,
    estoque: str,
    preco_custo: str = "0.00",
    nome: str = "Pão Francês",
    estoque_minimo: str = "0.000",
) -> Produto:
    cat = Categoria(nome="Padaria")
    db.add(cat)
    await db.flush()
    prod = Produto(
        categoria_id=cat.id,
        nome=nome,
        preco_venda=Decimal(preco_venda),
        preco_custo=Decimal(preco_custo),
        estoque_atual=Decimal(estoque),
        estoque_minimo=Decimal(estoque_minimo),
        unidade_medida="un",
        ativo=True,
    )
    db.add(prod)
    await db.flush()
    return prod
