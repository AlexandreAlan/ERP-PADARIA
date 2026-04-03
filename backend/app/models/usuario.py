from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, Integer, String, Boolean, Enum as SAEnum, DateTime
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import TimestampMixin, SoftDeleteMixin


class Usuario(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    perfil: Mapped[str] = mapped_column(
        SAEnum("admin", "gerente", "caixa", "estoquista"),
        nullable=False,
        default="caixa",
    )
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    vendas: Mapped[list["Venda"]] = relationship(  # noqa: F821
        back_populates="usuario",
        foreign_keys="[Venda.usuario_id]",
    )
    sessoes_caixa: Mapped[list["SessaoCaixa"]] = relationship(back_populates="usuario")  # noqa: F821
