"""
RelatorioDinamicoService — Tabela dinâmica de vendas: o usuário escolhe as
dimensões (por quê agrupar) e as métricas (o quê somar), o serviço monta a
consulta e devolve linhas agregadas.

Sempre pelo lado de ItemVenda (produto/categoria), nunca junto com forma de
pagamento — juntar as duas tabelas nessa consulta infla os totais (uma venda
com 2 itens e 2 pagamentos viraria 4 linhas, dobrando quantidade e valor).
Forma de pagamento tem os relatórios de caixa/financeiro à parte.
"""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.venda import Venda, ItemVenda
from app.models.produto import Produto, Categoria
from app.models.usuario import Usuario
from app.models.caixa import SessaoCaixa, Caixa
from app.models.cliente import Cliente


class RelatorioDinamicoError(Exception):
    """Combinação de dimensões/métricas/filtros inválida."""


_DIMENSOES = {
    "dia": lambda: func.date(Venda.created_at).label("dia"),
    "categoria": lambda: Categoria.nome.label("categoria"),
    "produto": lambda: Produto.nome.label("produto"),
    "operador": lambda: Usuario.nome.label("operador"),
    "caixa": lambda: Caixa.nome.label("caixa"),
    "cliente": lambda: func.coalesce(Cliente.nome, "Sem cliente").label("cliente"),
}

_METRICAS_SQL = {
    "quantidade": lambda: func.sum(ItemVenda.quantidade).label("quantidade"),
    "faturamento": lambda: func.sum(ItemVenda.total_item).label("faturamento"),
    "custo": lambda: func.sum(ItemVenda.custo_unit * ItemVenda.quantidade).label("custo"),
    "lucro": lambda: (
        func.sum(ItemVenda.total_item) - func.sum(ItemVenda.custo_unit * ItemVenda.quantidade)
    ).label("lucro"),
    "num_vendas": lambda: func.count(func.distinct(Venda.id)).label("num_vendas"),
}
# Calculada em Python a partir de faturamento/num_vendas (evita dividir por zero em SQL).
_METRICA_DERIVADA = "ticket_medio"
_METRICAS_MONETARIAS = {"faturamento", "custo", "lucro", "ticket_medio"}
_DUAS_CASAS = Decimal("0.01")

DIMENSOES_DISPONIVEIS = sorted(_DIMENSOES.keys())
METRICAS_DISPONIVEIS = sorted(list(_METRICAS_SQL.keys()) + [_METRICA_DERIVADA])


@dataclass
class FiltrosRelatorio:
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    categoria_id: Optional[int] = None
    produto_id: Optional[int] = None
    usuario_id: Optional[int] = None
    caixa_id: Optional[int] = None
    cliente_id: Optional[int] = None


@dataclass
class ResultadoRelatorio:
    dimensoes: list[str]
    metricas: list[str]
    linhas: list[dict] = field(default_factory=list)


async def gerar_relatorio(
    dimensoes: list[str],
    metricas: list[str],
    filtros: FiltrosRelatorio,
    db: AsyncSession,
) -> ResultadoRelatorio:
    if not dimensoes:
        raise RelatorioDinamicoError("Escolha ao menos uma dimensão (por quê agrupar).")
    if not metricas:
        raise RelatorioDinamicoError("Escolha ao menos uma métrica (o quê somar).")

    invalidas_dim = set(dimensoes) - set(_DIMENSOES)
    if invalidas_dim:
        raise RelatorioDinamicoError(f"Dimensão inválida: {invalidas_dim}. Use: {DIMENSOES_DISPONIVEIS}")
    invalidas_met = set(metricas) - set(METRICAS_DISPONIVEIS)
    if invalidas_met:
        raise RelatorioDinamicoError(f"Métrica inválida: {invalidas_met}. Use: {METRICAS_DISPONIVEIS}")

    precisa_num_vendas = _METRICA_DERIVADA in metricas
    metricas_sql = [m for m in metricas if m != _METRICA_DERIVADA]
    if precisa_num_vendas and "num_vendas" not in metricas_sql:
        metricas_sql = metricas_sql + ["num_vendas"]  # busca por baixo dos panos pro cálculo do ticket

    colunas_dim = [_DIMENSOES[d]() for d in dimensoes]
    colunas_met = [_METRICAS_SQL[m]() for m in metricas_sql]

    stmt = (
        select(*colunas_dim, *colunas_met)
        .select_from(Venda)
        .join(ItemVenda, ItemVenda.venda_id == Venda.id)
        .join(Produto, Produto.id == ItemVenda.produto_id)
        .join(Categoria, Categoria.id == Produto.categoria_id)
        .join(Usuario, Usuario.id == Venda.usuario_id)
        .join(SessaoCaixa, SessaoCaixa.id == Venda.sessao_id)
        .join(Caixa, Caixa.id == SessaoCaixa.caixa_id)
        .outerjoin(Cliente, Cliente.id == Venda.cliente_id)
        .where(Venda.status == "concluida")
        .group_by(*colunas_dim)
        .order_by(*colunas_dim)
    )

    if filtros.data_inicio:
        stmt = stmt.where(func.date(Venda.created_at) >= filtros.data_inicio)
    if filtros.data_fim:
        stmt = stmt.where(func.date(Venda.created_at) <= filtros.data_fim)
    if filtros.categoria_id:
        stmt = stmt.where(Categoria.id == filtros.categoria_id)
    if filtros.produto_id:
        stmt = stmt.where(Produto.id == filtros.produto_id)
    if filtros.usuario_id:
        stmt = stmt.where(Usuario.id == filtros.usuario_id)
    if filtros.caixa_id:
        stmt = stmt.where(Caixa.id == filtros.caixa_id)
    if filtros.cliente_id:
        stmt = stmt.where(Venda.cliente_id == filtros.cliente_id)

    result = await db.execute(stmt)
    colunas_nome = dimensoes + metricas_sql
    linhas = []
    for row in result.all():
        linha = dict(zip(colunas_nome, row))
        if precisa_num_vendas:
            faturamento = linha.get("faturamento")
            num_vendas = linha.get("num_vendas") or 0
            linha["ticket_medio"] = (
                (Decimal(str(faturamento)) / num_vendas).quantize(Decimal("0.01"))
                if faturamento and num_vendas else Decimal("0.00")
            )
            if "num_vendas" not in metricas:
                linha.pop("num_vendas", None)

        linha_formatada = {}
        for k, v in linha.items():
            if isinstance(v, Decimal):
                v = v.quantize(_DUAS_CASAS) if k in _METRICAS_MONETARIAS else v
                v = str(v)
            linha_formatada[k] = v
        linhas.append(linha_formatada)

    return ResultadoRelatorio(dimensoes=dimensoes, metricas=metricas, linhas=linhas)
