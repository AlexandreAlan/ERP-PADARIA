from datetime import datetime
from typing import Optional, Any
from sqlalchemy import BigInteger, Integer, String, JSON, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped
from app.database import Base


class LogAuditoria(Base):
    __tablename__ = "logs_auditoria"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("usuarios.id"), nullable=True)
    entidade: Mapped[str] = mapped_column(String(50), nullable=False)
    entidade_id: Mapped[str] = mapped_column(String(50), nullable=False)
    acao: Mapped[str] = mapped_column(
        SAEnum("criar", "editar", "deletar", "login", "logout", "cancelar", "ajuste", native_enum=False),
        nullable=False,
    )
    dados_anteriores: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    dados_novos: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
