"""Relatório dinâmico: agrupa vendas por dimensão escolhida, soma as métricas
pedidas, calcula ticket médio e recusa combinação inválida."""

from decimal import Decimal

import pytest

from app.schemas.venda import VendaCreate, ItemVendaCreate, PagamentoCreate
from app.services.venda_service import criar_venda
from app.services.relatorio_dinamico_service import (
    gerar_relatorio, FiltrosRelatorio, RelatorioDinamicoError,
)
from tests.factories import criar_usuario, criar_sessao, criar_produto


async def _vender(db, sessao_id, usuario_id, produto_id, quantidade, valor):
    payload = VendaCreate(
        sessao_id=sessao_id,
        itens=[ItemVendaCreate(produto_id=produto_id, quantidade=Decimal(quantidade))],
        pagamentos=[PagamentoCreate(forma="dinheiro", valor=Decimal(valor))],
    )
    return await criar_venda(payload, usuario_id, db)


async def test_agrupa_por_produto_com_quantidade_faturamento_custo_lucro(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id)
    p1 = await criar_produto(db, preco_venda="10.00", preco_custo="6.00", estoque="100", nome="Pão Francês")
    p2 = await criar_produto(db, preco_venda="20.00", preco_custo="12.00", estoque="100", nome="Bolo de Fubá")

    await _vender(db, s.id, u.id, p1.id, "5", "50.00")   # fat 50, custo 30
    await _vender(db, s.id, u.id, p2.id, "2", "40.00")   # fat 40, custo 24

    resultado = await gerar_relatorio(
        ["produto"], ["quantidade", "faturamento", "custo", "lucro"], FiltrosRelatorio(), db,
    )
    por_nome = {linha["produto"]: linha for linha in resultado.linhas}

    assert por_nome["Pão Francês"]["faturamento"] == "50.00"
    assert por_nome["Pão Francês"]["custo"] == "30.00"
    assert por_nome["Pão Francês"]["lucro"] == "20.00"
    assert por_nome["Bolo de Fubá"]["lucro"] == "16.00"


async def test_ticket_medio_calculado_em_python(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id)
    p = await criar_produto(db, preco_venda="10.00", estoque="100")

    await _vender(db, s.id, u.id, p.id, "1", "10.00")
    await _vender(db, s.id, u.id, p.id, "1", "10.00")
    await _vender(db, s.id, u.id, p.id, "3", "30.00")

    resultado = await gerar_relatorio(["produto"], ["faturamento", "ticket_medio"], FiltrosRelatorio(), db)
    linha = resultado.linhas[0]
    assert linha["faturamento"] == "50.00"
    # 3 vendas de 10/10/30 -> ticket medio = 50/3 = 16.67
    assert linha["ticket_medio"] == "16.67"
    assert "num_vendas" not in linha  # não foi pedido, só usado por baixo dos panos


async def test_filtro_por_periodo(db):
    from datetime import timedelta
    from app.utils.tempo import hoje_local
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id)
    p = await criar_produto(db, preco_venda="10.00", estoque="100")
    await _vender(db, s.id, u.id, p.id, "1", "10.00")

    ontem = hoje_local() - timedelta(days=1)
    resultado = await gerar_relatorio(
        ["produto"], ["faturamento"], FiltrosRelatorio(data_inicio=ontem, data_fim=ontem), db,
    )
    assert resultado.linhas == []  # a venda foi hoje, não ontem


async def test_dimensao_invalida_e_recusada(db):
    with pytest.raises(RelatorioDinamicoError, match="Dimensão"):
        await gerar_relatorio(["chute"], ["faturamento"], FiltrosRelatorio(), db)


async def test_sem_dimensao_ou_metrica_e_recusado(db):
    with pytest.raises(RelatorioDinamicoError):
        await gerar_relatorio([], ["faturamento"], FiltrosRelatorio(), db)
    with pytest.raises(RelatorioDinamicoError):
        await gerar_relatorio(["produto"], [], FiltrosRelatorio(), db)
