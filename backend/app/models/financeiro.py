from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import (
    BigInteger, Integer, String, Text, Numeric, Date, DateTime, Boolean,
    Enum as SAEnum, ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import TimestampMixin


class ContaBancaria(Base, TimestampMixin):
    __tablename__ = "contas_bancarias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    banco: Mapped[str] = mapped_column(String(80), nullable=False)
    agencia: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    conta: Mapped[str] = mapped_column(String(20), nullable=False)
    tipo: Mapped[str] = mapped_column(
        SAEnum("corrente", "poupanca", native_enum=False), nullable=False, default="corrente"
    )
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    lancamentos: Mapped[list["LancamentoBancario"]] = relationship(back_populates="conta_bancaria")


class LancamentoBancario(Base, TimestampMixin):
    __tablename__ = "lancamentos_bancarios"
    __table_args__ = (
        UniqueConstraint("conta_bancaria_id", "fitid", name="lancamentos_bancarios_conta_fitid_unique"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conta_bancaria_id: Mapped[int] = mapped_column(Integer, ForeignKey("contas_bancarias.id"), nullable=False)
    data: Mapped[date] = mapped_column(Date, nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False, default="")
    valor: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)  # sempre positivo; sinal vem de `tipo`
    tipo: Mapped[str] = mapped_column(SAEnum("credito", "debito", native_enum=False), nullable=False)
    # Id único do banco (campo FITID do OFX) — evita importar o mesmo extrato duas vezes.
    # NULL permitido (lançamento sem essa info); Postgres não trata múltiplos NULL como duplicata.
    fitid: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    conciliado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    conciliado_tipo: Mapped[Optional[str]] = mapped_column(
        SAEnum("venda", "pagamento", "ajuste_manual", native_enum=False), nullable=True
    )
    conciliado_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    conciliado_em: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    conciliado_por: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("usuarios.id"), nullable=True)

    conta_bancaria: Mapped["ContaBancaria"] = relationship(back_populates="lancamentos")


class OperadoraCartao(Base, TimestampMixin):
    __tablename__ = "operadoras_cartao"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    taxas: Mapped[list["TaxaCartao"]] = relationship(back_populates="operadora", cascade="all, delete-orphan")


class TaxaCartao(Base, TimestampMixin):
    __tablename__ = "taxas_cartao"
    __table_args__ = (
        UniqueConstraint(
            "operadora_id", "bandeira", "tipo", "parcelas",
            name="taxas_cartao_operadora_bandeira_tipo_parcelas_unique",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    operadora_id: Mapped[int] = mapped_column(Integer, ForeignKey("operadoras_cartao.id"), nullable=False)
    bandeira: Mapped[str] = mapped_column(
        SAEnum("visa", "master", "elo", "amex", "hipercard", "outra", native_enum=False), nullable=False
    )
    tipo: Mapped[str] = mapped_column(
        SAEnum("debito", "credito_vista", "credito_parcelado", native_enum=False), nullable=False
    )
    parcelas: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    taxa_percentual: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    dias_recebimento: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    operadora: Mapped["OperadoraCartao"] = relationship(back_populates="taxas")

    @property
    def valor_liquido_fator(self) -> Decimal:
        """Fração do valor bruto que sobra após a taxa (ex.: taxa 3.5% -> 0.965)."""
        return (Decimal("100") - self.taxa_percentual) / Decimal("100")
