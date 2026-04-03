from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, field_validator


class AberturaCaixaRequest(BaseModel):
    caixa_id: int
    valor_abertura: Decimal = Decimal("0.00")
    observacao: Optional[str] = None


class FechamentoCaixaRequest(BaseModel):
    valor_fechamento: Decimal
    observacao: Optional[str] = None


class SangriaRequest(BaseModel):
    valor: Decimal
    motivo: str

    @field_validator("valor")
    @classmethod
    def valor_positivo(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Valor deve ser positivo")
        return v


class SuprimentoRequest(BaseModel):
    valor: Decimal
    motivo: str

    @field_validator("valor")
    @classmethod
    def valor_positivo(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Valor deve ser positivo")
        return v


class SessaoCaixaRead(BaseModel):
    id: int
    caixa_id: int
    caixa_nome: str
    usuario_id: int
    usuario_nome: str
    status: str
    valor_abertura: Decimal
    valor_fechamento: Optional[Decimal]
    total_vendas: Decimal
    total_sangrias: Decimal
    total_suprimentos: Decimal
    diferenca: Optional[Decimal]
    observacao: Optional[str]
    opened_at: datetime
    closed_at: Optional[datetime]

    model_config = {"from_attributes": True}


class MovimentacaoCaixaRead(BaseModel):
    id: int
    sessao_id: int
    tipo: str
    valor: Decimal
    motivo: str
    usuario_nome: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ResumoFechamentoCaixa(BaseModel):
    sessao: SessaoCaixaRead
    total_dinheiro: Decimal
    total_cartao_credito: Decimal
    total_cartao_debito: Decimal
    total_pix: Decimal
    total_vale: Decimal
    quantidade_vendas: int
    ticket_medio: Decimal
