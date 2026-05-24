from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.caixa import Caixa, SessaoCaixa, MovimentacaoCaixa
from app.models.usuario import Usuario
from app.models.venda import Venda, Pagamento
from app.models.auditoria import LogAuditoria
from app.schemas.caixa import (
    AberturaCaixaRequest,
    FechamentoCaixaRequest,
    SangriaRequest,
    SuprimentoRequest,
    ResumoFechamentoCaixa,
    SessaoCaixaRead,
)

TWO = Decimal("0.01")

_D = lambda v: v.quantize(TWO, ROUND_HALF_UP)


# ── Public API ─────────────────────────────────────────────────────────────────

async def abrir_caixa(
    payload: AberturaCaixaRequest,
    usuario_id: int,
    db: AsyncSession,
) -> SessaoCaixa:
    sessao_existente = await _get_sessao_aberta_por_caixa(payload.caixa_id, db)
    if sessao_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Caixa já possui sessão aberta (ID: {sessao_existente.id})",
        )

    caixa = (await db.execute(
        select(Caixa).where(Caixa.id == payload.caixa_id, Caixa.ativo == True)
    )).scalar_one_or_none()
    if not caixa:
        raise HTTPException(status_code=404, detail="Caixa não encontrado")

    now = datetime.utcnow()
    sessao = SessaoCaixa(
        caixa_id=payload.caixa_id,
        usuario_id=usuario_id,
        status="aberto",
        valor_abertura=_D(payload.valor_abertura),
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
    sessao = (await db.execute(
        select(SessaoCaixa).where(SessaoCaixa.id == sessao_id, SessaoCaixa.status == "aberto")
    )).scalar_one_or_none()
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão aberta não encontrada")

    totais          = await _totalizar_formas_pagamento(sessao_id, db)
    now             = datetime.utcnow()
    valor_fechamento = _D(payload.valor_fechamento)
    saldo_esperado  = sessao.valor_abertura + sessao.total_vendas - sessao.total_sangrias + sessao.total_suprimentos
    diferenca       = _D(valor_fechamento - saldo_esperado)

    sessao.status           = "fechado"
    sessao.valor_fechamento = valor_fechamento
    sessao.diferenca        = diferenca
    sessao.observacao       = payload.observacao or sessao.observacao
    sessao.closed_at        = now

    db.add(LogAuditoria(
        usuario_id=usuario_id,
        entidade="sessao_caixa",
        entidade_id=str(sessao_id),
        acao="editar",
        dados_novos={"status": "fechado", "diferenca": str(diferenca)},
        created_at=now,
    ))
    await db.flush()

    qtd_vendas   = (await db.execute(
        select(func.count(Venda.id)).where(Venda.sessao_id == sessao_id, Venda.status == "concluida")
    )).scalar() or 0
    ticket_medio = _D(sessao.total_vendas / qtd_vendas) if qtd_vendas else Decimal("0.00")

    caixa_obj   = (await db.execute(select(Caixa).where(Caixa.id == sessao.caixa_id))).scalar_one_or_none()
    usuario_obj = (await db.execute(select(Usuario).where(Usuario.id == sessao.usuario_id))).scalar_one_or_none()

    sessao_read = SessaoCaixaRead(
        id=sessao.id,
        caixa_id=sessao.caixa_id,
        caixa_nome=caixa_obj.nome if caixa_obj else "",
        usuario_id=sessao.usuario_id,
        usuario_nome=usuario_obj.nome if usuario_obj else "",
        status=sessao.status,
        valor_abertura=sessao.valor_abertura,
        valor_fechamento=sessao.valor_fechamento,
        total_vendas=sessao.total_vendas,
        total_sangrias=sessao.total_sangrias,
        total_suprimentos=sessao.total_suprimentos,
        diferenca=sessao.diferenca,
        observacao=sessao.observacao,
        opened_at=sessao.opened_at,
        closed_at=sessao.closed_at,
    )

    return ResumoFechamentoCaixa(
        sessao=sessao_read,
        total_dinheiro=totais.get("dinheiro", Decimal("0.00")),
        total_cartao_credito=totais.get("cartao_credito", Decimal("0.00")),
        total_cartao_debito=totais.get("cartao_debito", Decimal("0.00")),
        total_pix=totais.get("pix", Decimal("0.00")),
        total_vale=totais.get("vale", Decimal("0.00")),
        quantidade_vendas=qtd_vendas,
        ticket_medio=ticket_medio,
    )


async def registrar_sangria(
    sessao_id: int, payload: SangriaRequest, usuario_id: int, db: AsyncSession,
) -> MovimentacaoCaixa:
    return await _registrar_movimentacao(sessao_id, "sangria", payload.valor, payload.motivo, usuario_id, db)


async def registrar_suprimento(
    sessao_id: int, payload: SuprimentoRequest, usuario_id: int, db: AsyncSession,
) -> MovimentacaoCaixa:
    return await _registrar_movimentacao(sessao_id, "suprimento", payload.valor, payload.motivo, usuario_id, db)


async def get_sessao_ativa(usuario_id: int, db: AsyncSession) -> Optional[SessaoCaixa]:
    return (await db.execute(
        select(SessaoCaixa).where(SessaoCaixa.usuario_id == usuario_id, SessaoCaixa.status == "aberto")
    )).scalar_one_or_none()


# ── Private helpers ────────────────────────────────────────────────────────────

async def _get_sessao_aberta_por_caixa(caixa_id: int, db: AsyncSession) -> Optional[SessaoCaixa]:
    return (await db.execute(
        select(SessaoCaixa).where(SessaoCaixa.caixa_id == caixa_id, SessaoCaixa.status == "aberto")
    )).scalar_one_or_none()


async def _registrar_movimentacao(
    sessao_id: int,
    tipo: str,
    valor: Decimal,
    motivo: str,
    usuario_id: int,
    db: AsyncSession,
) -> MovimentacaoCaixa:
    sessao = (await db.execute(
        select(SessaoCaixa).where(SessaoCaixa.id == sessao_id, SessaoCaixa.status == "aberto")
    )).scalar_one_or_none()
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão de caixa aberta não encontrada")

    valor_q = _D(valor)
    if tipo == "sangria":
        saldo = sessao.valor_abertura + sessao.total_vendas - sessao.total_sangrias + sessao.total_suprimentos
        if valor_q > saldo:
            raise HTTPException(status_code=422, detail="Saldo insuficiente para sangria")
        sessao.total_sangrias = _D(sessao.total_sangrias + valor_q)
    else:
        sessao.total_suprimentos = _D(sessao.total_suprimentos + valor_q)

    mov = MovimentacaoCaixa(
        sessao_id=sessao_id,
        tipo=tipo,
        valor=valor_q,
        motivo=motivo,
        usuario_id=usuario_id,
        created_at=datetime.utcnow(),
    )
    db.add(mov)
    await db.flush()
    return mov


async def _totalizar_formas_pagamento(sessao_id: int, db: AsyncSession) -> dict[str, Decimal]:
    rows = await db.execute(
        select(Pagamento.forma, func.sum(Pagamento.valor))
        .join(Venda, Venda.id == Pagamento.venda_id)
        .where(Venda.sessao_id == sessao_id, Venda.status == "concluida")
        .group_by(Pagamento.forma)
    )
    return {
        forma: (total or Decimal("0.00")).quantize(TWO, ROUND_HALF_UP)
        for forma, total in rows
    }
