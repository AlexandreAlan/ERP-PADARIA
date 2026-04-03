"""
DashboardService — Cálculo de KPIs, Curva ABC e alertas de estoque.
Todas as queries são somente leitura; nenhuma transação de escrita aqui.
"""

from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from sqlalchemy import select, func, and_, cast, Numeric
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.produto import Produto
from app.models.venda import Venda, ItemVenda, Pagamento
from app.schemas.dashboard import (
    KPIResumo,
    VendaDiaria,
    AlertaEstoque,
    CurvaABCItem,
    DashboardResponse,
)

TWO = Decimal("0.01")


async def get_dashboard(
    data_inicio: date,
    data_fim: date,
    db: AsyncSession,
    caixa_id: Optional[int] = None,
) -> DashboardResponse:
    kpis = await calcular_kpis(data_inicio, data_fim, db, caixa_id)
    vendas_dia = await vendas_por_dia(data_inicio, data_fim, db)
    alertas = await alertas_estoque(db)
    abc = await curva_abc(data_inicio, data_fim, db)

    return DashboardResponse(
        kpis=kpis,
        vendas_por_dia=vendas_dia,
        alertas_estoque=alertas,
        curva_abc=abc,
    )


async def calcular_kpis(
    data_inicio: date,
    data_fim: date,
    db: AsyncSession,
    caixa_id: Optional[int] = None,
) -> KPIResumo:
    dt_inicio = datetime.combine(data_inicio, datetime.min.time())
    dt_fim = datetime.combine(data_fim, datetime.max.time())

    filtros = [
        Venda.status == "concluida",
        Venda.created_at >= dt_inicio,
        Venda.created_at <= dt_fim,
    ]

    # Faturamento / desconto / totais
    result = await db.execute(
        select(
            func.count(Venda.id).label("qtd_vendas"),
            func.coalesce(func.sum(Venda.subtotal), 0).label("faturamento_bruto"),
            func.coalesce(func.sum(Venda.total), 0).label("faturamento_liquido"),
            func.coalesce(func.sum(Venda.desconto_valor), 0).label("total_descontos"),
        ).where(and_(*filtros))
    )
    row = result.one()

    # Custo e lucro (via itens)
    custo_result = await db.execute(
        select(
            func.coalesce(func.sum(ItemVenda.custo_unit * ItemVenda.quantidade), 0).label("custo_total"),
            func.coalesce(func.sum(ItemVenda.quantidade), 0).label("itens_vendidos"),
        )
        .join(Venda, Venda.id == ItemVenda.venda_id)
        .where(and_(*filtros))
    )
    custo_row = custo_result.one()

    faturamento_bruto = Decimal(str(row.faturamento_bruto)).quantize(TWO, ROUND_HALF_UP)
    faturamento_liquido = Decimal(str(row.faturamento_liquido)).quantize(TWO, ROUND_HALF_UP)
    custo_total = Decimal(str(custo_row.custo_total)).quantize(TWO, ROUND_HALF_UP)
    lucro_bruto = (faturamento_liquido - custo_total).quantize(TWO, ROUND_HALF_UP)
    margem_media = (lucro_bruto / faturamento_liquido * 100).quantize(TWO, ROUND_HALF_UP) if faturamento_liquido else Decimal("0.00")
    qtd_vendas = int(row.qtd_vendas)
    ticket_medio = (faturamento_liquido / qtd_vendas).quantize(TWO, ROUND_HALF_UP) if qtd_vendas else Decimal("0.00")

    return KPIResumo(
        faturamento_bruto=faturamento_bruto,
        faturamento_liquido=faturamento_liquido,
        custo_total=custo_total,
        lucro_bruto=lucro_bruto,
        margem_media=margem_media,
        quantidade_vendas=qtd_vendas,
        ticket_medio=ticket_medio,
        itens_vendidos=int(custo_row.itens_vendidos),
    )


async def vendas_por_dia(
    data_inicio: date,
    data_fim: date,
    db: AsyncSession,
) -> list[VendaDiaria]:
    dt_inicio = datetime.combine(data_inicio, datetime.min.time())
    dt_fim = datetime.combine(data_fim, datetime.max.time())

    result = await db.execute(
        select(
            func.date(Venda.created_at).label("data"),
            func.coalesce(func.sum(Venda.total), 0).label("total_vendas"),
            func.count(Venda.id).label("quantidade_vendas"),
        )
        .where(Venda.status == "concluida", Venda.created_at.between(dt_inicio, dt_fim))
        .group_by(func.date(Venda.created_at))
        .order_by(func.date(Venda.created_at))
    )

    return [
        VendaDiaria(
            data=str(row.data),
            total_vendas=Decimal(str(row.total_vendas)).quantize(TWO, ROUND_HALF_UP),
            quantidade_vendas=int(row.quantidade_vendas),
        )
        for row in result
    ]


async def alertas_estoque(db: AsyncSession) -> list[AlertaEstoque]:
    result = await db.execute(
        select(Produto).where(
            Produto.ativo == True,
            Produto.estoque_minimo > 0,
            Produto.estoque_atual <= Produto.estoque_minimo,
        ).order_by(Produto.estoque_atual)
    )
    produtos = result.scalars().all()

    return [
        AlertaEstoque(
            produto_id=p.id,
            produto_nome=p.nome,
            estoque_atual=p.estoque_atual,
            estoque_minimo=p.estoque_minimo,
            unidade_medida=p.unidade_medida,
        )
        for p in produtos
    ]


async def curva_abc(
    data_inicio: date,
    data_fim: date,
    db: AsyncSession,
) -> list[CurvaABCItem]:
    dt_inicio = datetime.combine(data_inicio, datetime.min.time())
    dt_fim = datetime.combine(data_fim, datetime.max.time())

    result = await db.execute(
        select(
            Produto.id.label("produto_id"),
            Produto.nome.label("produto_nome"),
            func.coalesce(func.sum(ItemVenda.quantidade), 0).label("quantidade_vendida"),
            func.coalesce(func.sum(ItemVenda.total_item), 0).label("faturamento"),
        )
        .join(ItemVenda, ItemVenda.produto_id == Produto.id, isouter=True)
        .join(Venda, and_(Venda.id == ItemVenda.venda_id, Venda.status == "concluida", Venda.created_at.between(dt_inicio, dt_fim)), isouter=True)
        .where(Produto.ativo == True)
        .group_by(Produto.id, Produto.nome)
        .order_by(func.coalesce(func.sum(ItemVenda.total_item), 0).desc())
    )

    rows = result.all()
    total_geral = sum(Decimal(str(r.faturamento)) for r in rows) or Decimal("1")

    itens: list[CurvaABCItem] = []
    acumulado = Decimal("0.00")

    for row in rows:
        fat = Decimal(str(row.faturamento)).quantize(TWO, ROUND_HALF_UP)
        fat_pct = (fat / total_geral * 100).quantize(TWO, ROUND_HALF_UP)
        acumulado = (acumulado + fat_pct).quantize(TWO, ROUND_HALF_UP)

        if acumulado <= Decimal("80"):
            classe = "A"
        elif acumulado <= Decimal("95"):
            classe = "B"
        else:
            classe = "C"

        itens.append(CurvaABCItem(
            produto_id=row.produto_id,
            produto_nome=row.produto_nome,
            quantidade_vendida=Decimal(str(row.quantidade_vendida)).quantize(Decimal("0.001"), ROUND_HALF_UP),
            faturamento=fat,
            faturamento_pct=fat_pct,
            faturamento_acumulado_pct=acumulado,
            classificacao=classe,
        ))

    return itens
