from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import mapped_column, Mapped
from app.database import Base
from app.models.base import TimestampMixin


class ConfiguracaoEmpresa(Base, TimestampMixin):
    """Configurações da empresa — tabela singleton (sempre id=1)."""

    __tablename__ = "configuracoes_empresa"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False, default="Padaria Exemplo")
    cnpj: Mapped[str | None] = mapped_column(String(20), nullable=True)
    telefone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    endereco: Mapped[str | None] = mapped_column(String(300), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mensagem_rodape: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # SMTP
    smtp_host: Mapped[str | None] = mapped_column(String(200), nullable=True)
    smtp_port: Mapped[int | None] = mapped_column(Integer, nullable=True, default=587)
    smtp_user: Mapped[str | None] = mapped_column(String(200), nullable=True)
    smtp_senha: Mapped[str | None] = mapped_column(String(300), nullable=True)
    smtp_from: Mapped[str | None] = mapped_column(String(200), nullable=True)
    smtp_tls: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    smtp_ssl: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
