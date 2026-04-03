from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, field_validator, model_validator


# ── Itens ──────────────────────────────────────────────────────────────────────

class ItemVendaCreate(BaseModel):
    produto_id: int
    quantidade: Decimal
    desconto_unit: Decimal = Decimal("0.00")

    @field_validator("quantidade")
    @classmethod
    def quantidade_positiva(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Quantidade deve ser maior que zero")
        return v


class ItemVendaRead(BaseModel):
    id: int
    produto_id: int
    produto_nome: str
    quantidade: Decimal
    preco_unit: Decimal
    custo_unit: Decimal
    desconto_unit: Decimal
    total_item: Decimal

    model_config = {"from_attributes": True}


# ── Pagamentos ─────────────────────────────────────────────────────────────────

class PagamentoCreate(BaseModel):
    forma: str  # dinheiro | cartao_credito | cartao_debito | pix | vale
    valor: Decimal
    nsu: Optional[str] = None

    @field_validator("forma")
    @classmethod
    def forma_valida(cls, v: str) -> str:
        validas = {"dinheiro", "cartao_credito", "cartao_debito", "pix", "vale"}
        if v not in validas:
            raise ValueError(f"Forma de pagamento inválida. Use: {validas}")
        return v

    @field_validator("valor")
    @classmethod
    def valor_positivo(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Valor do pagamento deve ser positivo")
        return v


class PagamentoRead(BaseModel):
    id: int
    forma: str
    valor: Decimal
    nsu: Optional[str]
    status: str

    model_config = {"from_attributes": True}


# ── Venda ──────────────────────────────────────────────────────────────────────

class VendaCreate(BaseModel):
    sessao_id: int
    itens: list[ItemVendaCreate]
    pagamentos: list[PagamentoCreate]
    desconto_valor: Decimal = Decimal("0.00")
    desconto_pct: Decimal = Decimal("0.00")
    observacao: Optional[str] = None

    @field_validator("itens")
    @classmethod
    def itens_nao_vazios(cls, v: list) -> list:
        if not v:
            raise ValueError("A venda deve ter pelo menos um item")
        return v

    @field_validator("pagamentos")
    @classmethod
    def pagamentos_nao_vazios(cls, v: list) -> list:
        if not v:
            raise ValueError("A venda deve ter pelo menos uma forma de pagamento")
        return v

    @model_validator(mode="after")
    def desconto_exclusivo(self) -> "VendaCreate":
        if self.desconto_valor > 0 and self.desconto_pct > 0:
            raise ValueError("Informe desconto_valor OU desconto_pct, não ambos")
        return self


class VendaRead(BaseModel):
    id: int
    uuid: str
    sessao_id: int
    usuario_id: int
    status: str
    subtotal: Decimal
    desconto_valor: Decimal
    desconto_pct: Decimal
    total: Decimal
    troco: Decimal
    observacao: Optional[str]
    itens: list[ItemVendaRead]
    pagamentos: list[PagamentoRead]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VendaCancelamento(BaseModel):
    motivo: str


class VendaListItem(BaseModel):
    id: int
    uuid: str
    status: str
    total: Decimal
    usuario_nome: str
    created_at: datetime

    model_config = {"from_attributes": True}
