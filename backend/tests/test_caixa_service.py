"""Testes do caixa: fechamento (saldo esperado, diferença, ticket médio) e
sangria/suprimento (com validação de saldo insuficiente)."""

from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.schemas.caixa import FechamentoCaixaRequest, SangriaRequest, SuprimentoRequest
from app.schemas.venda import VendaCreate, ItemVendaCreate, PagamentoCreate
from app.services.caixa_service import fechar_caixa, registrar_sangria, registrar_suprimento
from app.services.venda_service import criar_venda
from tests.factories import criar_usuario, criar_sessao, criar_produto


async def _vender(db, sessao_id, usuario_id, produto_id, quantidade, forma, valor):
    payload = VendaCreate(
        sessao_id=sessao_id,
        itens=[ItemVendaCreate(produto_id=produto_id, quantidade=Decimal(quantidade))],
        pagamentos=[PagamentoCreate(forma=forma, valor=Decimal(valor))],
    )
    return await criar_venda(payload, usuario_id, db)


async def test_fechar_caixa_sem_diferenca(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id, valor_abertura="100.00")
    p = await criar_produto(db, preco_venda="10.00", estoque="100")
    await _vender(db, s.id, u.id, p.id, "5", "dinheiro", "50.00")  # total_vendas = 50

    # saldo esperado = 100 (abertura) + 50 (vendas) = 150; fechou com 150 → 0.
    resumo = await fechar_caixa(s.id, FechamentoCaixaRequest(valor_fechamento=Decimal("150.00")), u.id, db)

    assert resumo.sessao.status == "fechado"
    assert resumo.sessao.diferenca == Decimal("0.00")
    assert resumo.quantidade_vendas == 1
    assert resumo.ticket_medio == Decimal("50.00")
    assert resumo.total_dinheiro == Decimal("50.00")


async def test_fechar_caixa_com_quebra_de_caixa(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id, valor_abertura="100.00")
    p = await criar_produto(db, preco_venda="10.00", estoque="100")
    await _vender(db, s.id, u.id, p.id, "5", "dinheiro", "50.00")

    # Fechou com 140, esperado 150 → faltam 10 (diferença negativa).
    resumo = await fechar_caixa(s.id, FechamentoCaixaRequest(valor_fechamento=Decimal("140.00")), u.id, db)
    assert resumo.sessao.diferenca == Decimal("-10.00")


async def test_sangria_reduz_saldo(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id, valor_abertura="200.00")

    await registrar_sangria(s.id, SangriaRequest(valor=Decimal("50.00"), motivo="troco banco"), u.id, db)
    assert s.total_sangrias == Decimal("50.00")


async def test_sangria_maior_que_saldo_falha(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id, valor_abertura="30.00")

    with pytest.raises(HTTPException) as exc:
        await registrar_sangria(s.id, SangriaRequest(valor=Decimal("100.00"), motivo="x"), u.id, db)
    assert exc.value.status_code == 422


async def test_suprimento_aumenta_saldo(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id, valor_abertura="0.00")

    await registrar_suprimento(s.id, SuprimentoRequest(valor=Decimal("80.00"), motivo="fundo de troco"), u.id, db)
    assert s.total_suprimentos == Decimal("80.00")
    # Com suprimento no saldo, agora a sangria de 80 passa.
    await registrar_sangria(s.id, SangriaRequest(valor=Decimal("80.00"), motivo="ok"), u.id, db)
    assert s.total_sangrias == Decimal("80.00")
