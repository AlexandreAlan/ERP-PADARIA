from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import Integer, BigInteger, String, Numeric, Date, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import TimestampMixin


class Compra(Base, TimestampMixin):
    __tablename__ = "compras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fornecedor_id: Mapped[int] = mapped_column(Integer, ForeignKey("fornecedores.id"), nullable=False)
    usuario_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("usuarios.id"), nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum("rascunho", "confirmado", "recebido", "cancelado"),
        nullable=False,
        default="rascunho",
    )
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    nota_fiscal: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    data_entrega: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Relationships
    fornecedor: Mapped["Fornecedor"] = relationship()  # noqa: F821
    itens: Mapped[list["ItemCompra"]] = relationship(back_populates="compra", cascade="all, delete-orphan")


class ItemCompra(Base):
    __tablename__ = "itens_compra"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    compra_id: Mapped[int] = mapped_column(Integer, ForeignKey("compras.id"), nullable=False)
    produto_id: Mapped[int] = mapped_column(Integer, ForeignKey("produtos.id"), nullable=False)
    quantidade: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    custo_unit: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_item: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Relationships
    compra: Mapped["Compra"] = relationship(back_populates="itens")
    produto: Mapped["Produto"] = relationship()  # noqa: F821
