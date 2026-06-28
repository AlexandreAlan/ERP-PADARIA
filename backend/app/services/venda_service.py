from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.venda import Venda, ItemVenda, Pagamento
from app.models.produto import Produto
from app.models.estoque import MovimentacaoEstoque
from app.models.auditoria import LogAuditoria
from app.models.caixa import SessaoCaixa
from app.schemas.venda import VendaCreate

settings = get_settings()

TWO = Decimal("0.01")


async def criar_venda(
    payload: VendaCreate,
    usuario_id: int,
    db: AsyncSession,
    ip_address: Optional[str] = None,
) -> Venda:
    # ── 1. Valida sessão ────────────────────────────────────────────────
    sessao = await _get_sessao_aberta(payload.sessao_id, db)

    # ── 2. Busca produtos ───────────────────────────────────────────────
    produto_ids = [item.produto_id for item in payload.itens]
    result = await db.execute(
        select(Produto)
        .where(Produto.id.in_(produto_ids), Produto.ativo.is_(True))
    )
    produtos_db: dict[int, Produto] = {p.id: p for p in result.scalars().all()}

    _validar_produtos_existem(produto_ids, produtos_db)

    # ── 3. Monta itens e valida estoque ─────────────────────────────────
    itens_calculados = []
    for item_in in payload.itens:
        produto = produtos_db[item_in.produto_id]
        _validar_estoque(produto, item_in.quantidade)

        preco_unit = produto.preco_venda
        custo_unit = produto.preco_custo
        desconto_unit = item_in.desconto_unit.quantize(TWO, ROUND_HALF_UP)
        total_item = ((preco_unit - desconto_unit) * item_in.quantidade).quantize(TWO, ROUND_HALF_UP)

        itens_calculados.append({
            "produto": produto,
            "quantidade": item_in.quantidade,
            "preco_unit": preco_unit,
            "custo_unit": custo_unit,
            "desconto_unit": desconto_unit,
            "total_item": total_item,
        })

    # ── 4. Calcula totais ────────────────────────────────────────────────
    subtotal = sum(i["total_item"] for i in itens_calculados).quantize(TWO, ROUND_HALF_UP)

    if payload.desconto_pct > 0:
        desconto_valor = (subtotal * payload.desconto_pct / 100).quantize(TWO, ROUND_HALF_UP)
    else:
        desconto_valor = payload.desconto_valor.quantize(TWO, ROUND_HALF_UP)

    if desconto_valor > subtotal:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Desconto não pode ser maior que o subtotal",
        )

    total = (subtotal - desconto_valor).quantize(TWO, ROUND_HALF_UP)

    # ── 5. Valida pagamentos ─────────────────────────────────────────────
    total_pago = sum(p.valor for p in payload.pagamentos).quantize(TWO, ROUND_HALF_UP)
    if total_pago < total:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Valor pago ({total_pago}) é menor que o total ({total})",
        )

    formas_dinheiro = {p.forma for p in payload.pagamentos if p.forma == "dinheiro"}
    troco = (total_pago - total).quantize(TWO, ROUND_HALF_UP) if formas_dinheiro else Decimal("0.00")

    # ── 6. Cria Venda ────────────────────────────────────────────────────
    now = datetime.utcnow()
    venda = Venda(
        uuid=str(uuid.uuid4()),
        sessao_id=payload.sessao_id,
        usuario_id=usuario_id,
        status="concluida",
        subtotal=subtotal,
        desconto_valor=desconto_valor,
        desconto_pct=payload.desconto_pct,
        total=total,
        troco=troco,
        observacao=payload.observacao,
        created_at=now,
        updated_at=now,
    )
    db.add(venda)
    await db.flush()  # obtém venda.id

    # ── 7a. Cria itens ───────────────────────────────────────────────────
    for ic in itens_calculados:
        item = ItemVenda(
            venda_id=venda.id,
            produto_id=ic["produto"].id,
            quantidade=ic["quantidade"],
            preco_unit=ic["preco_unit"],
            custo_unit=ic["custo_unit"],
            desconto_unit=ic["desconto_unit"],
            total_item=ic["total_item"],
        )
        db.add(item)

    # ── 7b. Cria pagamentos ──────────────────────────────────────────────
    for pag_in in payload.pagamentos:
        pag = Pagamento(
            venda_id=venda.id,
            forma=pag_in.forma,
            valor=pag_in.valor.quantize(TWO, ROUND_HALF_UP),
            nsu=pag_in.nsu,
            status="aprovado",
            created_at=now,
        )
        db.add(pag)

    # ── 8. Deduz estoque ─────────────────────────────────────────────────
    for ic in itens_calculados:
        produto = ic["produto"]
        saldo_antes = produto.estoque_atual
        saldo_depois = saldo_antes - ic["quantidade"]

        produto.estoque_atual = saldo_depois
        produto.updated_at = now

        mov = MovimentacaoEstoque(
            produto_id=produto.id,
            tipo="venda",
            quantidade=ic["quantidade"],
            saldo_antes=saldo_antes,
            saldo_depois=saldo_depois,
            custo_unit=ic["custo_unit"],
            referencia_id=venda.id,
            referencia_tipo="venda",
            usuario_id=usuario_id,
            created_at=now,
        )
        db.add(mov)

    # ── 9. Atualiza totais da sessão ─────────────────────────────────────
    sessao.total_vendas = (sessao.total_vendas + total).quantize(TWO, ROUND_HALF_UP)

    # ── 10. Audit log ────────────────────────────────────────────────────
    log = LogAuditoria(
        usuario_id=usuario_id,
        entidade="venda",
        entidade_id=str(venda.id),
        acao="criar",
        dados_novos={"total": str(total), "itens": len(itens_calculados)},
        ip_address=ip_address,
        created_at=now,
    )
    db.add(log)
    await db.flush()

    # Carrega relacionamentos de forma eager para evitar lazy-load em contexto async
    result = await db.execute(
        select(Venda)
        .options(
            selectinload(Venda.itens).selectinload(ItemVenda.produto),
            selectinload(Venda.pagamentos),
        )
        .where(Venda.id == venda.id)
    )
    return result.scalar_one()


async def cancelar_venda(
    venda_id: int,
    motivo: str,
    usuario_id: int,
    db: AsyncSession,
    ip_address: Optional[str] = None,
) -> Venda:
    result = await db.execute(
        select(Venda).where(Venda.id == venda_id)
    )
    venda = result.scalar_one_or_none()

    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    if venda.status != "concluida":
        raise HTTPException(status_code=422, detail=f"Venda com status '{venda.status}' não pode ser cancelada")

    now = datetime.utcnow()
    venda.status = "cancelada"
    venda.cancelado_por = usuario_id
    venda.cancelado_em = now
    venda.motivo_cancelamento = motivo
    venda.updated_at = now

    # Estorna estoque
    itens_result = await db.execute(select(ItemVenda).where(ItemVenda.venda_id == venda_id))
    itens = itens_result.scalars().all()

    for item in itens:
        prod_result = await db.execute(
            select(Produto).where(Produto.id == item.produto_id)
        )
        produto = prod_result.scalar_one()
        saldo_antes = produto.estoque_atual
        saldo_depois = saldo_antes + item.quantidade

        produto.estoque_atual = saldo_depois
        produto.updated_at = now

        mov = MovimentacaoEstoque(
            produto_id=produto.id,
            tipo="devolucao",
            quantidade=item.quantidade,
            saldo_antes=saldo_antes,
            saldo_depois=saldo_depois,
            custo_unit=item.custo_unit,
            referencia_id=venda.id,
            referencia_tipo="venda",
            usuario_id=usuario_id,
            created_at=now,
        )
        db.add(mov)

    # Reverte total da sessão
    sessao_result = await db.execute(select(SessaoCaixa).where(SessaoCaixa.id == venda.sessao_id))
    sessao = sessao_result.scalar_one()
    sessao.total_vendas = max(Decimal("0.00"), sessao.total_vendas - venda.total)

    db.add(LogAuditoria(
        usuario_id=usuario_id,
        entidade="venda",
        entidade_id=str(venda.id),
        acao="cancelar",
        dados_novos={"motivo": motivo},
        ip_address=ip_address,
        created_at=now,
    ))

    await db.flush()
    result = await db.execute(
        select(Venda)
        .options(
            selectinload(Venda.itens).selectinload(ItemVenda.produto),
            selectinload(Venda.pagamentos),
        )
        .where(Venda.id == venda.id)
    )
    return result.scalar_one()


# ── Helpers privados ───────────────────────────────────────────────────────────

async def _get_sessao_aberta(sessao_id: int, db: AsyncSession) -> SessaoCaixa:
    result = await db.execute(
        select(SessaoCaixa).where(SessaoCaixa.id == sessao_id, SessaoCaixa.status == "aberto")
    )
    sessao = result.scalar_one_or_none()
    if not sessao:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nenhuma sessão de caixa aberta. Abra o caixa antes de vender.",
        )
    return sessao


def _validar_produtos_existem(ids: list[int], produtos_db: dict[int, Produto]) -> None:
    faltando = [pid for pid in ids if pid not in produtos_db]
    if faltando:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto(s) não encontrado(s) ou inativo(s): {faltando}",
        )


def _validar_estoque(produto: Produto, quantidade: Decimal) -> None:
    if produto.estoque_atual < quantidade:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Estoque insuficiente para '{produto.nome}'. "
                f"Disponível: {produto.estoque_atual} {produto.unidade_medida}, "
                f"Solicitado: {quantidade}"
            ),
        )
