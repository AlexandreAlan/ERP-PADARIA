import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.configuracao import ConfiguracaoEmpresa
from app.models.usuario import Usuario
from app.services import email_service

router = APIRouter()
settings = get_settings()


# ── Schemas ───────────────────────────────────────────────────────────────────

class EmpresaRead(BaseModel):
    id: int
    nome: str
    cnpj: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    logo_url: Optional[str] = None
    mensagem_rodape: Optional[str] = None
    model_config = {"from_attributes": True}


class EmpresaUpdate(BaseModel):
    nome: Optional[str] = None
    cnpj: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    mensagem_rodape: Optional[str] = None


class SmtpRead(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_from: Optional[str] = None
    smtp_tls: bool = True
    smtp_ssl: bool = False
    # senha NUNCA é devolvida ao frontend
    smtp_configurado: bool = False
    model_config = {"from_attributes": True}


class SmtpUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_senha: Optional[str] = None   # None = não alterar senha
    smtp_from: Optional[str] = None
    smtp_tls: Optional[bool] = None
    smtp_ssl: Optional[bool] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_or_create_empresa(db: AsyncSession) -> ConfiguracaoEmpresa:
    """Retorna a configuração da empresa (cria o registro singleton se não existir)."""
    result = await db.execute(select(ConfiguracaoEmpresa).where(ConfiguracaoEmpresa.id == 1))
    config = result.scalar_one_or_none()
    if not config:
        now = datetime.utcnow()
        config = ConfiguracaoEmpresa(
            id=1,
            nome=settings.padaria_nome,
            cnpj=settings.padaria_cnpj or None,
            telefone=settings.padaria_telefone or None,
            endereco=settings.padaria_endereco or None,
            cidade=settings.padaria_cidade or None,
            mensagem_rodape=settings.padaria_mensagem_rodape or None,
            created_at=now,
            updated_at=now,
        )
        db.add(config)
        await db.flush()
    return config


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/empresa", response_model=EmpresaRead)
async def get_empresa(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await _get_or_create_empresa(db)


@router.put("/empresa", response_model=EmpresaRead)
async def update_empresa(
    payload: EmpresaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    config = await _get_or_create_empresa(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(config, field, value)
    config.updated_at = datetime.utcnow()
    await db.flush()
    return config


@router.post("/empresa/logo", response_model=EmpresaRead)
async def upload_logo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="O arquivo deve ser uma imagem (JPEG, PNG, etc.)")

    content = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande (máximo {settings.max_upload_size_mb} MB)",
        )

    ext = os.path.splitext(file.filename or "logo")[1].lower() or ".png"
    filename = f"logo_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(settings.upload_dir, filename)

    os.makedirs(settings.upload_dir, exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(content)

    config = await _get_or_create_empresa(db)

    # Remove logo anterior se existir
    if config.logo_url:
        old_path = os.path.join(settings.upload_dir, os.path.basename(config.logo_url))
        if os.path.exists(old_path) and os.path.basename(old_path).startswith("logo_"):
            try:
                os.remove(old_path)
            except OSError:
                pass

    config.logo_url = f"/uploads/{filename}"
    config.updated_at = datetime.utcnow()
    await db.flush()
    return config


# ── SMTP endpoints ────────────────────────────────────────────────────────────

def _smtp_read(config: ConfiguracaoEmpresa) -> SmtpRead:
    return SmtpRead(
        smtp_host=config.smtp_host,
        smtp_port=config.smtp_port,
        smtp_user=config.smtp_user,
        smtp_from=config.smtp_from,
        smtp_tls=config.smtp_tls,
        smtp_ssl=config.smtp_ssl,
        smtp_configurado=bool(config.smtp_host and config.smtp_user and config.smtp_senha),
    )


@router.get("/smtp", response_model=SmtpRead)
async def get_smtp(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    config = await _get_or_create_empresa(db)
    return _smtp_read(config)


@router.put("/smtp", response_model=SmtpRead)
async def update_smtp(
    payload: SmtpUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    config = await _get_or_create_empresa(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        # Ignora senha se veio vazia (mantém a existente)
        if field == "smtp_senha" and not value:
            continue
        setattr(config, field, value)
    config.updated_at = datetime.utcnow()
    await db.flush()
    return _smtp_read(config)


@router.post("/smtp/testar", status_code=200)
async def testar_smtp(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    config = await _get_or_create_empresa(db)
    try:
        await email_service.testar_smtp(config)
    except email_service.SmtpNotConfiguredError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Falha na conexão SMTP: {exc}")
    return {"ok": True, "mensagem": "Conexão SMTP estabelecida com sucesso!"}
