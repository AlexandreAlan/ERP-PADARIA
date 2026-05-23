from decimal import Decimal
from typing import Optional, Dict
from pydantic import BaseModel


class KPIResumo(BaseModel):
    faturamento_bruto: Decimal
    faturamento_liquido: Decimal      # após descontos
    custo_total: Decimal
    lucro_bruto: Decimal
    margem_media: Decimal             # %
    quantidade_vendas: int
    ticket_medio: Decimal
    itens_vendidos: int


class VendaDiaria(BaseModel):
    data: str                         # YYYY-MM-DD
    total_vendas: Decimal
    quantidade_vendas: int


class AlertaEstoque(BaseModel):
    produto_id: int
    produto_nome: str
    estoque_atual: Decimal
    estoque_minimo: Decimal
    unidade_medida: str
    urgente: bool = False


class CurvaABCItem(BaseModel):
    produto_id: int
    produto_nome: str
    quantidade_vendida: Decimal
    faturamento: Decimal
    faturamento_pct: Decimal
    faturamento_acumulado_pct: Decimal
    classificacao: str               # A | B | C


class DashboardResponse(BaseModel):
    kpis: KPIResumo
    vendas_por_dia: list[VendaDiaria]
    alertas_estoque: list[AlertaEstoque]
    curva_abc: list[CurvaABCItem]
    crescimento: Optional[Dict[str, float]] = None


class FiltroRelatorio(BaseModel):
    data_inicio: str                  # YYYY-MM-DD
    data_fim: str
    caixa_id: Optional[int] = None
    usuario_id: Optional[int] = None
    categoria_id: Optional[int] = None
