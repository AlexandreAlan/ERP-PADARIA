from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import (
    BigInteger, Integer, String, Text, Numeric, DateTime, Boolean,
    Enum as SAEnum, ForeignKey,
)
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import TimestampMixin


class Caixa(Base, TimestampMixin):
    __tablename__ = "caixas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    descricao: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    sessoes: Mapped[list["SessaoCaixa"]] = relationship(back_populates="caixa")


class SessaoCaixa(Base):
    __tablename__ = "sessoes_caixa"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    caixa_id: Mapped[int] = mapped_column(Integer, ForeignKey("caixas.id"), nullable=False)
    usuario_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("usuarios.id"), nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum("aberto", "fechado"),
        nullable=False,
        default="aberto",
    )
    valor_abertura: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    valor_fechamento: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    total_vendas: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    total_sangrias: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    total_suprimentos: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    diferenca: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    observacao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    opened_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    caixa: Mapped["Caixa"] = relationship(back_populates="sessoes")
    usuario: Mapped["Usuario"] = relationship(back_populates="sessoes_caixa")  # noqa: F821
    vendas: Mapped[list["Venda"]] = relationship(back_populates="sessao")  # noqa: F821
    movimentacoes: Mapped[list["MovimentacaoCaixa"]] = relationship(back_populates="sessao")


class MovimentacaoCaixa(Base):
    __tablename__ = "movimentacoes_caixa"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sessao_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sessoes_caixa.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(
        SAEnum("sangria", "suprimento"),
        nullable=False,
    )
    valor: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    motivo: Mapped[str] = mapped_column(String(255), nullable=False)
    usuario_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("usuarios.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    sessao: Mapped["SessaoCaixa"] = relationship(back_populates="movimentacoes")
