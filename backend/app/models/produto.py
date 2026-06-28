from decimal import Decimal
from typing import Optional
from sqlalchemy import (
    Integer, String, Text, Boolean, Numeric,
    Enum as SAEnum, ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import TimestampMixin, SoftDeleteMixin


class Categoria(Base, TimestampMixin):
    __tablename__ = "categorias"
    __table_args__ = (
        UniqueConstraint(
            "nome", "parent_id",
            name="categorias_nome_parent_unique",
            postgresql_nulls_not_distinct=True,
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(80), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categorias.id", ondelete="SET NULL"), nullable=True, index=True
    )

    produtos: Mapped[list["Produto"]] = relationship(back_populates="categoria")
    parent: Mapped[Optional["Categoria"]] = relationship(
        "Categoria", remote_side="Categoria.id", back_populates="filhos"
    )
    filhos: Mapped[list["Categoria"]] = relationship(
        "Categoria", back_populates="parent", cascade="save-update"
    )


class Fornecedor(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "fornecedores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    razao_social: Mapped[str] = mapped_column(String(150), nullable=False)
    cnpj: Mapped[Optional[str]] = mapped_column(String(18), nullable=True, unique=True)
    telefone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    produtos: Mapped[list["Produto"]] = relationship(back_populates="fornecedor")


class Produto(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "produtos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_barras: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, unique=True)
    sku: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, unique=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    categoria_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categorias.id"), nullable=False
    )
    fornecedor_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("fornecedores.id"), nullable=True
    )
    unidade_medida: Mapped[str] = mapped_column(
        SAEnum("un", "kg", "g", "l", "ml", "pct", native_enum=False),
        nullable=False,
        default="un",
    )
    preco_custo: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    preco_venda: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    estoque_atual: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False, default=Decimal("0.000"))
    estoque_minimo: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False, default=Decimal("0.000"))
    estoque_maximo: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 3), nullable=True)
    imagem_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    categoria: Mapped["Categoria"] = relationship(back_populates="produtos")
    fornecedor: Mapped[Optional["Fornecedor"]] = relationship(back_populates="produtos")
    itens_venda: Mapped[list["ItemVenda"]] = relationship(back_populates="produto")  # noqa: F821
    movimentacoes: Mapped[list["MovimentacaoEstoque"]] = relationship(back_populates="produto")  # noqa: F821

    @property
    def margem_lucro(self) -> Decimal:
        if self.preco_custo and self.preco_custo > 0:
            return ((self.preco_venda - self.preco_custo) / self.preco_custo * 100).quantize(Decimal("0.01"))
        return Decimal("0.00")

    @property
    def estoque_baixo(self) -> bool:
        return self.estoque_atual <= self.estoque_minimo and self.estoque_minimo > 0
