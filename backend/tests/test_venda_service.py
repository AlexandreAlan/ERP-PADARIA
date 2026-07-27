"""Testes do coração do PDV: cálculo de venda, troco, desconto, baixa e
estorno de estoque e as validações de negócio (estoque, pagamento, sessão)."""

from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.models.estoque import MovimentacaoEstoque
from app.schemas.venda import VendaCreate, ItemVendaCreate, PagamentoCreate
from app.services.venda_service import criar_venda, cancelar_venda
from tests.factories import criar_usuario, criar_sessao, criar_produto


def _payload(sessao_id, produto_id, quantidade, pagamentos, **kwargs):
    return VendaCreate(
        sessao_id=sessao_id,
        itens=[ItemVendaCreate(produto_id=produto_id, quantidade=Decimal(quantidade))],
        pagamentos=[PagamentoCreate(forma=f, valor=Decimal(v)) for f, v in pagamentos],
        **kwargs,
    )


async def test_venda_simples_totaliza_e_baixa_estoque(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id)
    p = await criar_produto(db, preco_venda="5.00", estoque="10")

    venda = await criar_venda(_payload(s.id, p.id, "2", [("dinheiro", "10.00")]), u.id, db)

    assert venda.subtotal == Decimal("10.00")
    assert venda.total == Decimal("10.00")
    assert venda.troco == Decimal("0.00")
    assert venda.status == "concluida"
    assert p.estoque_atual == Decimal("8")           # 10 - 2
    assert s.total_vendas == Decimal("10.00")

    # Movimentação de estoque registrada com saldos corretos.
    movs = (await db.execute(select(MovimentacaoEstoque))).scalars().all()
    assert len(movs) == 1
    assert movs[0].tipo == "venda"
    assert movs[0].saldo_antes == Decimal("10") and movs[0].saldo_depois == Decimal("8")


async def test_troco_quando_paga_em_dinheiro(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id)
    p = await criar_produto(db, preco_venda="5.00", estoque="10")

    venda = await criar_venda(_payload(s.id, p.id, "2", [("dinheiro", "20.00")]), u.id, db)
    assert venda.total == Decimal("10.00")
    assert venda.troco == Decimal("10.00")           # 20 - 10


async def test_sem_troco_quando_nao_ha_dinheiro(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id)
    p = await criar_produto(db, preco_venda="5.00", estoque="10")

    # Paga a mais no cartão: não gera troco (troco só existe pra dinheiro).
    venda = await criar_venda(_payload(s.id, p.id, "2", [("cartao_credito", "15.00")]), u.id, db)
    assert venda.troco == Decimal("0.00")


async def test_desconto_percentual(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id)
    p = await criar_produto(db, preco_venda="50.00", estoque="10")

    venda = await criar_venda(
        _payload(s.id, p.id, "2", [("dinheiro", "90.00")], desconto_pct=Decimal("10")),
        u.id, db,
    )
    assert venda.subtotal == Decimal("100.00")
    assert venda.desconto_valor == Decimal("10.00")   # 10% de 100
    assert venda.total == Decimal("90.00")


async def test_desconto_valor_absoluto(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id)
    p = await criar_produto(db, preco_venda="50.00", estoque="10")

    venda = await criar_venda(
        _payload(s.id, p.id, "2", [("dinheiro", "85.00")], desconto_valor=Decimal("15.00")),
        u.id, db,
    )
    assert venda.total == Decimal("85.00")            # 100 - 15


async def test_desconto_maior_que_subtotal_falha(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id)
    p = await criar_produto(db, preco_venda="10.00", estoque="10")

    with pytest.raises(HTTPException) as exc:
        await criar_venda(
            _payload(s.id, p.id, "1", [("dinheiro", "10.00")], desconto_valor=Decimal("20.00")),
            u.id, db,
        )
    assert exc.value.status_code == 422


async def test_pagamento_insuficiente_falha(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id)
    p = await criar_produto(db, preco_venda="10.00", estoque="10")

    with pytest.raises(HTTPException) as exc:
        await criar_venda(_payload(s.id, p.id, "2", [("dinheiro", "10.00")]), u.id, db)
    assert exc.value.status_code == 422              # pago 10 < total 20


async def test_estoque_insuficiente_falha(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id)
    p = await criar_produto(db, preco_venda="10.00", estoque="1")

    with pytest.raises(HTTPException) as exc:
        await criar_venda(_payload(s.id, p.id, "5", [("dinheiro", "50.00")]), u.id, db)
    assert exc.value.status_code == 422


async def test_produto_inexistente_falha(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id)

    with pytest.raises(HTTPException) as exc:
        await criar_venda(_payload(s.id, 99999, "1", [("dinheiro", "10.00")]), u.id, db)
    assert exc.value.status_code == 404


async def test_sessao_fechada_falha(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id, status="fechado")
    p = await criar_produto(db, preco_venda="10.00", estoque="10")

    with pytest.raises(HTTPException) as exc:
        await criar_venda(_payload(s.id, p.id, "1", [("dinheiro", "10.00")]), u.id, db)
    assert exc.value.status_code == 403


async def test_cancelar_venda_estorna_estoque_e_sessao(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id)
    p = await criar_produto(db, preco_venda="5.00", estoque="10")

    venda = await criar_venda(_payload(s.id, p.id, "3", [("dinheiro", "15.00")]), u.id, db)
    assert p.estoque_atual == Decimal("7")
    assert s.total_vendas == Decimal("15.00")

    cancelada = await cancelar_venda(venda.id, "cliente desistiu", u.id, db)
    assert cancelada.status == "cancelada"
    assert p.estoque_atual == Decimal("10")          # estoque estornado
    assert s.total_vendas == Decimal("0.00")         # total da sessão revertido
