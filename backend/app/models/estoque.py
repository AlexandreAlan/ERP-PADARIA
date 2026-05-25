from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, Integer, String, Text, Numeric, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base


class MovimentacaoEstoque(Base):
    __tablename__ = "movimentacoes_estoque"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    produto_id: Mapped[int] = mapped_column(Integer, ForeignKey("produtos.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(
        SAEnum("entrada", "saida", "ajuste", "perda", "devolucao", "venda", native_enum=False),
        nullable=False,
    )
    quantidade: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    saldo_antes: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    saldo_depois: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    custo_unit: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    referencia_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    referencia_tipo: Mapped[Optional[str]] = mapped_column(
        SAEnum("venda", "compra", "ajuste_manual", native_enum=False),
        nullable=True,
    )
    usuario_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("usuarios.id"), nullable=False)
    observacao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    produto: Mapped["Produto"] = relationship(back_populates="movimentacoes")  # noqa: F821
