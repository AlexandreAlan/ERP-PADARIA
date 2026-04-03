"""
EmailService — envio de e-mail via SMTP usando stdlib (smtplib).
Toda I/O de rede é delegada para asyncio.to_thread para não bloquear o event loop.
"""

import asyncio
import smtplib
import ssl
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.models.configuracao import ConfiguracaoEmpresa


class SmtpNotConfiguredError(Exception):
    pass


def _build_config_error(missing: list[str]) -> SmtpNotConfiguredError:
    fields = ", ".join(missing)
    return SmtpNotConfiguredError(
        f"Configuração SMTP incompleta. Campos obrigatórios ausentes: {fields}"
    )


def _validate_smtp(cfg: ConfiguracaoEmpresa) -> None:
    missing = []
    if not cfg.smtp_host:
        missing.append("smtp_host")
    if not cfg.smtp_port:
        missing.append("smtp_port")
    if not cfg.smtp_user:
        missing.append("smtp_user")
    if not cfg.smtp_senha:
        missing.append("smtp_senha")
    if not cfg.smtp_from:
        missing.append("smtp_from (remetente)")
    if missing:
        raise _build_config_error(missing)


def _send_email_sync(
    cfg: ConfiguracaoEmpresa,
    destinatario: str,
    assunto: str,
    corpo: str,
    attachment_bytes: Optional[bytes] = None,
    attachment_filename: Optional[str] = None,
) -> None:
    """Executa o envio de forma síncrona — deve ser chamado via asyncio.to_thread."""
    _validate_smtp(cfg)

    msg = MIMEMultipart()
    msg["From"]    = cfg.smtp_from
    msg["To"]      = destinatario
    msg["Subject"] = assunto
    msg.attach(MIMEText(corpo, "plain", "utf-8"))

    if attachment_bytes and attachment_filename:
        part = MIMEBase("application", "octet-stream")
        part.set_payload(attachment_bytes)
        encoders.encode_base64(part)
        part.add_header(
            "Content-Disposition",
            f'attachment; filename="{attachment_filename}"',
        )
        msg.attach(part)

    host  = cfg.smtp_host
    port  = cfg.smtp_port or 587
    user  = cfg.smtp_user
    senha = cfg.smtp_senha

    if cfg.smtp_ssl:
        # SSL direto (porta 465)
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(host, port, context=context, timeout=15) as server:
            server.login(user, senha)
            server.sendmail(cfg.smtp_from, destinatario, msg.as_string())
    else:
        # STARTTLS (porta 587) ou sem TLS (porta 25)
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            if cfg.smtp_tls:
                context = ssl.create_default_context()
                server.starttls(context=context)
                server.ehlo()
            server.login(user, senha)
            server.sendmail(cfg.smtp_from, destinatario, msg.as_string())


def _test_smtp_sync(cfg: ConfiguracaoEmpresa) -> None:
    """Testa apenas a autenticação SMTP sem enviar mensagem."""
    _validate_smtp(cfg)

    host  = cfg.smtp_host
    port  = cfg.smtp_port or 587
    user  = cfg.smtp_user
    senha = cfg.smtp_senha

    if cfg.smtp_ssl:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(host, port, context=context, timeout=10) as server:
            server.login(user, senha)
    else:
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.ehlo()
            if cfg.smtp_tls:
                context = ssl.create_default_context()
                server.starttls(context=context)
                server.ehlo()
            server.login(user, senha)


# ── Public async API ──────────────────────────────────────────────────────────

async def enviar_email(
    cfg: ConfiguracaoEmpresa,
    destinatario: str,
    assunto: str,
    corpo: str,
    attachment_bytes: Optional[bytes] = None,
    attachment_filename: Optional[str] = None,
) -> None:
    await asyncio.to_thread(
        _send_email_sync,
        cfg,
        destinatario,
        assunto,
        corpo,
        attachment_bytes,
        attachment_filename,
    )


async def testar_smtp(cfg: ConfiguracaoEmpresa) -> None:
    await asyncio.to_thread(_test_smtp_sync, cfg)
