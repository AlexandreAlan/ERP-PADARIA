from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import computed_field, model_validator

# Valores de exemplo/placeholder que NUNCA podem valer como segredo real em
# produção (o do código e o do .env.example).
_JWT_PLACEHOLDERS = {
    "change-me-in-production-min-32-chars!!",
    "troque-por-uma-chave-secreta-forte-aqui-minimo-32-chars",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "ERP Padaria"
    app_env: str = "development"
    # Bind interno do container em todas as interfaces; a exposição ao host é
    # restrita a 127.0.0.1 pelo docker-compose (ports: "127.0.0.1:...:8000").
    app_host: str = "0.0.0.0"  # nosec B104
    app_port: int = 8000
    # Off por padrão: com debug ligado, o Swagger/OpenAPI fica exposto e os
    # erros vazam stack trace. O ambiente de dev liga via APP_DEBUG=true (.env).
    app_debug: bool = False

    # Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "erp_padaria"
    db_user: str = "root"
    db_password: str = ""
    # Defina DATABASE_URL diretamente no .env para sobrescrever a URL gerada
    database_url_override: str = ""

    @computed_field
    @property
    def database_url(self) -> str:
        if self.database_url_override:
            return self.database_url_override
        # SQLite local quando db_host == "sqlite"
        if self.db_host == "sqlite":
            return f"sqlite+aiosqlite:///./{self.db_name}.db"
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    # JWT
    jwt_secret_key: str = "change-me-in-production-min-32-chars!!"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 480
    jwt_refresh_token_expire_days: int = 7

    # CORS
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @computed_field
    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    # Padaria info (usado no cupom)
    padaria_nome: str = "Padaria Exemplo"
    padaria_cnpj: str = "00.000.000/0001-00"
    padaria_endereco: str = ""
    padaria_cidade: str = ""
    padaria_telefone: str = ""
    padaria_mensagem_rodape: str = "Obrigado pela preferência!"

    # Impressora
    printer_type: str = "usb"       # usb | network | file
    printer_vendor_id: str = "0x0416"
    printer_product_id: str = "0x5011"
    printer_network_ip: str = "192.168.1.100"
    printer_network_port: int = 9100
    printer_paper_width: int = 80

    # PIX
    pix_enabled: bool = False
    pix_client_id: str = ""
    pix_client_secret: str = ""
    pix_certificate_path: str = "./certs/certificado.p12"
    pix_certificate_password: str = ""
    pix_pix_key: str = ""
    pix_sandbox: bool = True
    pix_webhook_url: str = ""

    # Upload
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 5

    @model_validator(mode="after")
    def _validar_seguranca_producao(self) -> "Settings":
        """Em produção (APP_ENV=production), recusa subir com um JWT fraco —
        evita rodar com o segredo público do código/exemplo caso o .env falte
        ou esteja mal configurado."""
        if self.app_env == "production":
            if self.jwt_secret_key in _JWT_PLACEHOLDERS or len(self.jwt_secret_key) < 32:
                raise ValueError(
                    "JWT_SECRET_KEY inseguro para produção: defina uma chave forte e única "
                    "com pelo menos 32 caracteres (não use o valor de exemplo)."
                )
        return self



@lru_cache
def get_settings() -> Settings:
    return Settings()
