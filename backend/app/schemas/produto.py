from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, field_validator


class ProdutoCreate(BaseModel):
    codigo_barras: Optional[str] = None
    sku: Optional[str] = None
    nome: str
    descricao: Optional[str] = None
    categoria_id: int
    fornecedor_id: Optional[int] = None
    unidade_medida: str = "un"
    preco_custo: Decimal = Decimal("0.00")
    preco_venda: Decimal
    estoque_atual: Decimal = Decimal("0.000")
    estoque_minimo: Decimal = Decimal("0.000")
    estoque_maximo: Optional[Decimal] = None
    imagem_url: Optional[str] = None

    @field_validator("preco_venda")
    @classmethod
    def preco_venda_positivo(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Preço de venda deve ser positivo")
        return v

    @field_validator("unidade_medida")
    @classmethod
    def unidade_valida(cls, v: str) -> str:
        if v not in {"un", "kg", "g", "l", "ml", "pct"}:
            raise ValueError("Unidade de medida inválida")
        return v


class ProdutoUpdate(BaseModel):
    codigo_barras: Optional[str] = None
    sku: Optional[str] = None
    nome: Optional[str] = None
    descricao: Optional[str] = None
    categoria_id: Optional[int] = None
    fornecedor_id: Optional[int] = None
    unidade_medida: Optional[str] = None
    preco_custo: Optional[Decimal] = None
    preco_venda: Optional[Decimal] = None
    estoque_minimo: Optional[Decimal] = None
    estoque_maximo: Optional[Decimal] = None
    imagem_url: Optional[str] = None
    ativo: Optional[bool] = None


class ProdutoRead(BaseModel):
    id: int
    codigo_barras: Optional[str]
    sku: Optional[str]
    nome: str
    descricao: Optional[str]
    categoria_id: int
    categoria_nome: Optional[str] = None
    fornecedor_id: Optional[int]
    fornecedor_nome: Optional[str] = None
    unidade_medida: str
    preco_custo: Decimal
    preco_venda: Decimal
    margem_lucro: Decimal
    estoque_atual: Decimal
    estoque_minimo: Decimal
    estoque_maximo: Optional[Decimal]
    estoque_baixo: bool
    imagem_url: Optional[str]
    ativo: bool

    model_config = {"from_attributes": True}


class ProdutoListItem(BaseModel):
    id: int
    codigo_barras: Optional[str]
    nome: str
    preco_venda: Decimal
    estoque_atual: Decimal
    estoque_minimo: Decimal
    estoque_baixo: bool
    unidade_medida: str
    categoria_nome: Optional[str] = None
    ativo: bool

    model_config = {"from_attributes": True}


class CategoriaRead(BaseModel):
    id: int
    nome: str
    descricao: Optional[str]
    ativo: bool
    parent_id: Optional[int] = None

    model_config = {"from_attributes": True}


class CategoriaCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    parent_id: Optional[int] = None


class CategoriaUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    parent_id: Optional[int] = None


class FornecedorRead(BaseModel):
    id: int
    razao_social: str
    cnpj: Optional[str]
    telefone: Optional[str]
    email: Optional[str]
    ativo: bool

    model_config = {"from_attributes": True}


class FornecedorCreate(BaseModel):
    razao_social: str
    cnpj: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
