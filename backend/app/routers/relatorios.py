from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_admin_gerente
from app.models.configuracao import ConfiguracaoEmpresa
from app.models.usuario import Usuario
from app.services import relatorio_service, email_service

router = APIRouter()


class EnviarRelatorioEmail(BaseModel):
    destinatario: EmailStr
    assunto: Optional[str] = None
    data_inicio: date
    data_fim: date
    caixa_id: Optional[int] = None


@router.get("/vendas/pdf")
async def relatorio_vendas_pdf(
    data_inicio: date = Query(...),
    data_fim: date = Query(...),
    caixa_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin_gerente),
):
    pdf_bytes = await relatorio_service.gerar_pdf_vendas(data_inicio, data_fim, db, caixa_id)
    filename = f"vendas_{data_inicio}_{data_fim}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/vendas/excel")
async def relatorio_vendas_excel(
    data_inicio: date = Query(...),
    data_fim: date = Query(...),
    caixa_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin_gerente),
):
    xlsx_bytes = await relatorio_service.gerar_excel_vendas(data_inicio, data_fim, db, caixa_id)
    filename = f"vendas_{data_inicio}_{data_fim}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/vendas/email", status_code=200)
async def enviar_relatorio_email(
    payload: EnviarRelatorioEmail,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin_gerente),
):
    # Busca configuração SMTP
    result = await db.execute(select(ConfiguracaoEmpresa).where(ConfiguracaoEmpresa.id == 1))
    cfg = result.scalar_one_or_none()
    if not cfg or not cfg.smtp_host:
        raise HTTPException(
            status_code=400,
            detail="Configuração SMTP não definida. Acesse Configurações → E-mail / SMTP.",
        )

    # Gera o PDF
    pdf_bytes = await relatorio_service.gerar_pdf_vendas(
        payload.data_inicio, payload.data_fim, db, payload.caixa_id
    )

    filename = f"vendas_{payload.data_inicio}_{payload.data_fim}.pdf"
    assunto = payload.assunto or f"Relatório de Vendas — {payload.data_inicio} a {payload.data_fim}"
    corpo = (
        f"Olá,\n\n"
        f"Segue em anexo o relatório de vendas do período "
        f"{payload.data_inicio} a {payload.data_fim}.\n\n"
        f"Enviado pelo ERP {cfg.nome}."
    )

    try:
        await email_service.enviar_email(
            cfg=cfg,
            destinatario=str(payload.destinatario),
            assunto=assunto,
            corpo=corpo,
            attachment_bytes=pdf_bytes,
            attachment_filename=filename,
        )
    except email_service.SmtpNotConfiguredError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Erro ao enviar e-mail: {exc}")

    return {"ok": True, "mensagem": f"Relatório enviado para {payload.destinatario}."}
