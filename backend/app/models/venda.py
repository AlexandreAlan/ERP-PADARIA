from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import (
    BigInteger, Integer, String, Text, Numeric, DateTime,
    Enum as SAEnum, ForeignKey, Boolean,
)
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import TimestampMixin


class Venda(Base, TimestampMixin):
    __tablename__ = "vendas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    sessao_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sessoes_caixa.id"), nullable=False)
    usuario_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("usuarios.id"), nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum("rascunho", "concluida", "cancelada"),
        nullable=False,
        default="rascunho",
    )
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    desconto_valor: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    desconto_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("0.00"))
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    troco: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    observacao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancelado_por: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("usuarios.id"), nullable=True
    )
    cancelado_em: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    motivo_cancelamento: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    sessao: Mapped["SessaoCaixa"] = relationship(back_populates="vendas")  # noqa: F821
    usuario: Mapped["Usuario"] = relationship(back_populates="vendas", foreign_keys="[Venda.usuario_id]")  # noqa: F821
    itens: Mapped[list["ItemVenda"]] = relationship(back_populates="venda", cascade="all, delete-orphan")
    pagamentos: Mapped[list["Pagamento"]] = relationship(back_populates="venda", cascade="all, delete-orphan")


class ItemVenda(Base):
    __tablename__ = "itens_venda"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    venda_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("vendas.id"), nullable=False)
    produto_id: Mapped[int] = mapped_column(Integer, ForeignKey("produtos.id"), nullable=False)
    quantidade: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    preco_unit: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    custo_unit: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    desconto_unit: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    total_item: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Relationships
    venda: Mapped["Venda"] = relationship(back_populates="itens")
    produto: Mapped["Produto"] = relationship(back_populates="itens_venda")  # noqa: F821


class Pagamento(Base):
    __tablename__ = "pagamentos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    venda_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("vendas.id"), nullable=False)
    forma: Mapped[str] = mapped_column(
        SAEnum(
            "dinheiro", "cartao_credito", "cartao_debito", "pix", "vale",
        ),
        nullable=False,
    )
    valor: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    nsu: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum("pendente", "aprovado", "recusado"),
        nullable=False,
        default="aprovado",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    venda: Mapped["Venda"] = relationship(back_populates="pagamentos")
