from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.caixa import Caixa, SessaoCaixa, MovimentacaoCaixa
from app.models.venda import Venda, Pagamento
from app.models.auditoria import LogAuditoria
from app.schemas.caixa import (
    AberturaCaixaRequest,
    FechamentoCaixaRequest,
    SangriaRequest,
    SuprimentoRequest,
    ResumoFechamentoCaixa,
)

TWO = Decimal("0.01")


async def abrir_caixa(
    payload: AberturaCaixaRequest,
    usuario_id: int,
    db: AsyncSession,
) -> SessaoCaixa:
    # Verifica se já existe sessão aberta para este caixa
    result = await db.execute(
        select(SessaoCaixa).where(
            SessaoCaixa.caixa_id == payload.caixa_id,
            SessaoCaixa.status == "aberto",
        )
    )
    sessao_existente = result.scalar_one_or_none()
    if sessao_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Caixa já possui sessão aberta (ID: {sessao_existente.id})",
        )

    # Verifica se o caixa existe
    caixa_result = await db.execute(
        select(Caixa).where(Caixa.id == payload.caixa_id, Caixa.ativo == True)
    )
    caixa = caixa_result.scalar_one_or_none()
    if not caixa:
        raise HTTPException(status_code=404, detail="Caixa não encontrado")

    now = datetime.utcnow()
    sessao = SessaoCaixa(
        caixa_id=payload.caixa_id,
        usuario_id=usuario_id,
        status="aberto",
        valor_abertura=payload.valor_abertura.quantize(TWO, ROUND_HALF_UP),
        observacao=payload.observacao,
        opened_at=now,
    )
    db.add(sessao)
    await db.flush()

    db.add(LogAuditoria(
        usuario_id=usuario_id,
        entidade="sessao_caixa",
        entidade_id=str(sessao.id),
        acao="criar",
        dados_novos={"valor_abertura": str(payload.valor_abertura)},
        created_at=now,
    ))

    await db.flush()
    return sessao


async def fechar_caixa(
    sessao_id: int,
    payload: FechamentoCaixaRequest,
    usuario_id: int,
    db: AsyncSession,
) -> ResumoFechamentoCaixa:
    result = await db.execute(
        select(SessaoCaixa).where(
            SessaoCaixa.id == sessao_id,
            SessaoCaixa.status == "aberto",
        )
    )
    sessao = result.scalar_one_or_none()
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão aberta não encontrada")

    # Totaliza por forma de pagamento
    totais = await _totalizar_formas_pagamento(sessao_id, db)

    now = datetime.utcnow()
    valor_fechamento = payload.valor_fechamento.quantize(TWO, ROUND_HALF_UP)
    diferenca = (valor_fechamento - (sessao.valor_abertura + sessao.total_vendas - sessao.total_sangrias + sessao.total_suprimentos)).quantize(TWO, ROUND_HALF_UP)

    sessao.status = "fechado"
    sessao.valor_fechamento = valor_fechamento
    sessao.diferenca = diferenca
    sessao.observacao = payload.observacao or sessao.observacao
    sessao.closed_at = now

    db.add(LogAuditoria(
        usuario_id=usuario_id,
        entidade="sessao_caixa",
        entidade_id=str(sessao_id),
        acao="editar",
        dados_novos={"status": "fechado", "diferenca": str(diferenca)},
        created_at=now,
    ))

    await db.flush()

    qtd_result = await db.execute(
        select(func.count(Venda.id)).where(Venda.sessao_id == sessao_id, Venda.status == "concluida")
    )
    qtd_vendas = qtd_result.scalar() or 0
    ticket_medio = (sessao.total_vendas / qtd_vendas).quantize(TWO, ROUND_HALF_UP) if qtd_vendas else Decimal("0.00")

    return ResumoFechamentoCaixa(
        sessao=sessao,
        total_dinheiro=totais.get("dinheiro", Decimal("0.00")),
        total_cartao_credito=totais.get("cartao_credito", Decimal("0.00")),
        total_cartao_debito=totais.get("cartao_debito", Decimal("0.00")),
        total_pix=totais.get("pix", Decimal("0.00")),
        total_vale=totais.get("vale", Decimal("0.00")),
        quantidade_vendas=qtd_vendas,
        ticket_medio=ticket_medio,
    )


async def registrar_sangria(
    sessao_id: int,
    payload: SangriaRequest,
    usuario_id: int,
    db: AsyncSession,
) -> MovimentacaoCaixa:
    return await _registrar_movimentacao(sessao_id, "sangria", payload.valor, payload.motivo, usuario_id, db)


async def registrar_suprimento(
    sessao_id: int,
    payload: SuprimentoRequest,
    usuario_id: int,
    db: AsyncSession,
) -> MovimentacaoCaixa:
    return await _registrar_movimentacao(sessao_id, "suprimento", payload.valor, payload.motivo, usuario_id, db)


async def get_sessao_ativa(usuario_id: int, db: AsyncSession) -> Optional[SessaoCaixa]:
    """Retorna a sessão aberta do usuário, se existir."""
    result = await db.execute(
        select(SessaoCaixa).where(
            SessaoCaixa.usuario_id == usuario_id,
            SessaoCaixa.status == "aberto",
        )
    )
    return result.scalar_one_or_none()


# ── Helpers privados ───────────────────────────────────────────────────────────

async def _registrar_movimentacao(
    sessao_id: int,
    tipo: str,
    valor: Decimal,
    motivo: str,
    usuario_id: int,
    db: AsyncSession,
) -> MovimentacaoCaixa:
    result = await db.execute(
        select(SessaoCaixa).where(
            SessaoCaixa.id == sessao_id,
            SessaoCaixa.status == "aberto",
        )
    )
    sessao = result.scalar_one_or_none()
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão de caixa aberta não encontrada")

    valor_q = valor.quantize(TWO, ROUND_HALF_UP)
    if tipo == "sangria":
        saldo_disponivel = sessao.valor_abertura + sessao.total_vendas - sessao.total_sangrias + sessao.total_suprimentos
        if valor_q > saldo_disponivel:
            raise HTTPException(status_code=422, detail="Saldo insuficiente para sangria")
        sessao.total_sangrias = (sessao.total_sangrias + valor_q).quantize(TWO, ROUND_HALF_UP)
    else:
        sessao.total_suprimentos = (sessao.total_suprimentos + valor_q).quantize(TWO, ROUND_HALF_UP)

    now = datetime.utcnow()
    mov = MovimentacaoCaixa(
        sessao_id=sessao_id,
        tipo=tipo,
        valor=valor_q,
        motivo=motivo,
        usuario_id=usuario_id,
        created_at=now,
    )
    db.add(mov)
    await db.flush()

    return mov


async def _totalizar_formas_pagamento(sessao_id: int, db: AsyncSession) -> dict[str, Decimal]:
    from sqlalchemy import select
    result = await db.execute(
        select(Pagamento.forma, func.sum(Pagamento.valor))
        .join(Venda, Venda.id == Pagamento.venda_id)
        .where(Venda.sessao_id == sessao_id, Venda.status == "concluida")
        .group_by(Pagamento.forma)
    )
    return {row[0]: (row[1] or Decimal("0.00")).quantize(Decimal("0.01"), ROUND_HALF_UP) for row in result}
