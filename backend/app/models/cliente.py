from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import Integer, String, Numeric, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import TimestampMixin, SoftDeleteMixin


class Cliente(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    telefone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    cpf: Mapped[Optional[str]] = mapped_column(String(14), nullable=True, unique=True)
    data_nascimento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    observacao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pontos_fidelidade: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )

    vendas: Mapped[list["Venda"]] = relationship(back_populates="cliente")  # noqa: F821
