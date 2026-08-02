"""Testes do dashboard: KPIs financeiros (faturamento, custo, lucro, margem,
ticket) e alertas de estoque (produtos abaixo do mínimo + flag de urgência)."""

from decimal import Decimal

from app.schemas.venda import VendaCreate, ItemVendaCreate, PagamentoCreate
from app.services.dashboard_service import calcular_kpis, alertas_estoque
from app.services.venda_service import criar_venda
from app.utils.tempo import hoje_local
from tests.factories import criar_usuario, criar_sessao, criar_produto


async def _vender(db, sessao_id, usuario_id, produto_id, quantidade, total):
    payload = VendaCreate(
        sessao_id=sessao_id,
        itens=[ItemVendaCreate(produto_id=produto_id, quantidade=Decimal(quantidade))],
        pagamentos=[PagamentoCreate(forma="dinheiro", valor=Decimal(total))],
    )
    return await criar_venda(payload, usuario_id, db)


async def test_kpis_faturamento_lucro_margem(db):
    u = await criar_usuario(db)
    s = await criar_sessao(db, u.id)
    p = await criar_produto(db, preco_venda="10.00", preco_custo="6.00", estoque="100")

    await _vender(db, s.id, u.id, p.id, "5", "50.00")   # subtotal/total 50, custo 30
    await _vender(db, s.id, u.id, p.id, "3", "30.00")   # subtotal/total 30, custo 18

    hoje = hoje_local()
    kpis = await calcular_kpis(hoje, hoje, db)

    assert kpis.faturamento_bruto == Decimal("80.00")   # soma dos subtotais
    assert kpis.faturamento_liquido == Decimal("80.00")
    assert kpis.custo_total == Decimal("48.00")         # 30 + 18
    assert kpis.lucro_bruto == Decimal("32.00")         # 80 - 48
    assert kpis.margem_media == Decimal("40.00")        # 32/80 * 100
    assert kpis.quantidade_vendas == 2
    assert kpis.ticket_medio == Decimal("40.00")        # 80 / 2
    assert kpis.itens_vendidos == 8                     # 5 + 3


async def test_kpis_periodo_vazio_zera_tudo(db):
    kpis = await calcular_kpis(hoje_local(), hoje_local(), db)
    assert kpis.faturamento_liquido == Decimal("0.00")
    assert kpis.margem_media == Decimal("0.00")         # sem div-por-zero
    assert kpis.ticket_medio == Decimal("0.00")
    assert kpis.quantidade_vendas == 0


async def test_alertas_estoque_flag_e_urgencia(db):
    # A: crítico (2 de 10, ≤30% do mínimo → urgente)
    a = await criar_produto(db, preco_venda="1.00", estoque="2", estoque_minimo="10", nome="Farinha")
    # B: baixo mas não urgente (8 de 10)
    b = await criar_produto(db, preco_venda="1.00", estoque="8", estoque_minimo="10", nome="Açúcar")
    # C: acima do mínimo → não entra no alerta
    await criar_produto(db, preco_venda="1.00", estoque="50", estoque_minimo="10", nome="Sal")
    # D: sem mínimo definido → não entra (estoque_minimo = 0)
    await criar_produto(db, preco_venda="1.00", estoque="0", estoque_minimo="0", nome="Fermento")

    alertas = await alertas_estoque(db)

    ids = [al.produto_id for al in alertas]
    assert ids == [a.id, b.id]        # só A e B, mais crítico primeiro
    por_id = {al.produto_id: al for al in alertas}
    assert por_id[a.id].urgente is True
    assert por_id[b.id].urgente is False
