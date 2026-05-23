from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user, require_caixa
from app.models.usuario import Usuario
from app.models.venda import Venda, ItemVenda
from app.models.produto import Produto
from app.schemas.venda import VendaCreate, VendaRead, VendaCancelamento
from app.services import venda_service
from app.services import escpos_service
from app.services.escpos_service import DadosRecibo, ItemRecibo

router = APIRouter()


@router.post("", response_model=VendaRead, status_code=201)
async def criar_venda(
    payload: VendaCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_caixa),
):
    venda = await venda_service.criar_venda(
        payload=payload,
        usuario_id=current_user.id,
        db=db,
        ip_address=request.client.host if request.client else None,
    )

    # Tenta imprimir recibo de forma não-bloqueante
    try:
        await _imprimir_recibo(venda, current_user.nome, db)
    except Exception:
        pass  # Falha na impressão não cancela a venda

    return _build_venda_read(venda)


@router.get("/{venda_id}", response_model=VendaRead)
async def get_venda(
    venda_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(
        select(Venda)
        .options(
            selectinload(Venda.itens).selectinload(ItemVenda.produto),
            selectinload(Venda.pagamentos),
        )
        .where(Venda.id == venda_id)
    )
    venda = result.scalar_one_or_none()
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    return _build_venda_read(venda)


@router.post("/{venda_id}/cancelar", response_model=VendaRead)
async def cancelar_venda(
    venda_id: int,
    payload: VendaCancelamento,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_caixa),
):
    venda = await venda_service.cancelar_venda(
        venda_id=venda_id,
        motivo=payload.motivo,
        usuario_id=current_user.id,
        db=db,
        ip_address=request.client.host if request.client else None,
    )
    return _build_venda_read(venda)


@router.get("/{venda_id}/recibo")
async def imprimir_recibo(
    venda_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_caixa),
):
    """Reimprime o recibo de uma venda. Retorna os bytes ESC/POS."""
    from fastapi.responses import Response
    result = await db.execute(select(Venda).where(Venda.id == venda_id))
    venda = result.scalar_one_or_none()
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    await db.refresh(venda, ["itens", "pagamentos"])

    dados = await _montar_dados_recibo(venda, current_user.nome, db)
    buf = escpos_service.gerar_recibo(dados)
    return Response(content=buf, media_type="application/octet-stream")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _build_venda_read(venda: Venda) -> VendaRead:
    from app.schemas.venda import ItemVendaRead, PagamentoRead
    return VendaRead(
        id=venda.id,
        uuid=venda.uuid,
        sessao_id=venda.sessao_id,
        usuario_id=venda.usuario_id,
        status=venda.status,
        subtotal=venda.subtotal,
        desconto_valor=venda.desconto_valor,
        desconto_pct=venda.desconto_pct,
        total=venda.total,
        troco=venda.troco,
        observacao=venda.observacao,
        itens=[
            ItemVendaRead(
                id=item.id,
                produto_id=item.produto_id,
                produto_nome=item.produto.nome if item.produto else "",
                quantidade=item.quantidade,
                preco_unit=item.preco_unit,
                custo_unit=item.custo_unit,
                desconto_unit=item.desconto_unit,
                total_item=item.total_item,
            )
            for item in venda.itens
        ],
        pagamentos=[
            PagamentoRead(
                id=p.id,
                forma=p.forma,
                valor=p.valor,
                nsu=p.nsu,
                status=p.status,
            )
            for p in venda.pagamentos
        ],
        created_at=venda.created_at,
        updated_at=venda.updated_at,
    )


async def _montar_dados_recibo(venda: Venda, operador_nome: str, db: AsyncSession) -> DadosRecibo:
    from app.models.caixa import SessaoCaixa, Caixa

    sessao_result = await db.execute(
        select(SessaoCaixa, Caixa)
        .join(Caixa, Caixa.id == SessaoCaixa.caixa_id)
        .where(SessaoCaixa.id == venda.sessao_id)
    )
    sessao_row = sessao_result.first()
    caixa_nome = sessao_row[1].nome if sessao_row else "Caixa"

    itens = []
    for item in venda.itens:
        # item.produto já deve estar carregado via selectinload; fallback para nome do id
        produto = item.produto if item.produto else None
        itens.append(ItemRecibo(
            nome=produto.nome if produto else f"Produto #{item.produto_id}",
            quantidade=item.quantidade,
            preco_unit=item.preco_unit,
            total_item=item.total_item,
            unidade=produto.unidade_medida if produto else "un",
        ))

    return DadosRecibo(
        numero_venda=venda.id,
        uuid_venda=venda.uuid,
        operador=operador_nome,
        caixa_nome=caixa_nome,
        itens=itens,
        subtotal=venda.subtotal,
        desconto=venda.desconto_valor,
        total=venda.total,
        pagamentos=[{"forma": p.forma, "valor": p.valor} for p in venda.pagamentos],
        troco=venda.troco,
        data_hora=venda.created_at,
    )


async def _imprimir_recibo(venda: Venda, operador_nome: str, db: AsyncSession):
    dados = await _montar_dados_recibo(venda, operador_nome, db)
    escpos_service.imprimir(dados)
