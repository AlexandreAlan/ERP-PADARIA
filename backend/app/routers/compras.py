import re
from datetime import datetime
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_estoque
from app.models.usuario import Usuario
from app.models.compra import Compra, ItemCompra
from app.models.produto import Produto, Fornecedor
from app.models.estoque import MovimentacaoEstoque
from app.schemas.produto import ProdutoCreate
from app.routers.produtos import criar_produto
from app.services.nfe_xml_service import parse_nfe_xml, NFeInvalidaError

_TAMANHO_MAXIMO_XML = 5 * 1024 * 1024  # 5 MB — XML de NF-e real nunca chega perto disso

router = APIRouter()


class ItemCompraOut(BaseModel):
    id: int
    produto_id: int
    produto_nome: str
    quantidade: Decimal
    custo_unit: Decimal
    total_item: Decimal

    model_config = {"from_attributes": True}


class CompraOut(BaseModel):
    id: int
    fornecedor_id: int
    fornecedor_nome: str
    status: str
    total: Decimal
    nota_fiscal: Optional[str]
    data_entrega: Optional[str]
    created_at: str
    itens: list[ItemCompraOut] = []

    model_config = {"from_attributes": True}


class ItemCompraIn(BaseModel):
    produto_id: int
    quantidade: Decimal
    custo_unit: Decimal


class CompraCreate(BaseModel):
    fornecedor_id: int
    itens: list[ItemCompraIn]
    nota_fiscal: Optional[str] = None
    data_entrega: Optional[str] = None


@router.get("", response_model=list[CompraOut])
async def listar_compras(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_estoque),
):
    result = await db.execute(
        select(Compra)
        .options(selectinload(Compra.fornecedor), selectinload(Compra.itens).selectinload(ItemCompra.produto))
        .order_by(desc(Compra.created_at))
        .limit(100)
    )
    compras = result.scalars().all()
    out = []
    for c in compras:
        out.append(CompraOut(
            id=c.id,
            fornecedor_id=c.fornecedor_id,
            fornecedor_nome=c.fornecedor.razao_social if c.fornecedor else "",
            status=c.status,
            total=c.total,
            nota_fiscal=c.nota_fiscal,
            data_entrega=str(c.data_entrega) if c.data_entrega else None,
            created_at=c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else "",
            itens=[
                ItemCompraOut(
                    id=it.id,
                    produto_id=it.produto_id,
                    produto_nome=it.produto.nome if it.produto else "",
                    quantidade=it.quantidade,
                    custo_unit=it.custo_unit,
                    total_item=it.total_item,
                )
                for it in c.itens
            ],
        ))
    return out


@router.post("", status_code=201)
async def criar_compra(
    payload: CompraCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_estoque),
):
    now = datetime.utcnow()
    total = sum(i.quantidade * i.custo_unit for i in payload.itens)

    compra = Compra(
        fornecedor_id=payload.fornecedor_id,
        usuario_id=current_user.id,
        status="confirmado",
        total=total.quantize(Decimal("0.01")),
        nota_fiscal=payload.nota_fiscal,
        created_at=now,
        updated_at=now,
    )
    db.add(compra)
    await db.flush()

    for item_in in payload.itens:
        item = ItemCompra(
            compra_id=compra.id,
            produto_id=item_in.produto_id,
            quantidade=item_in.quantidade,
            custo_unit=item_in.custo_unit,
            total_item=(item_in.quantidade * item_in.custo_unit).quantize(Decimal("0.01")),
        )
        db.add(item)

    await db.commit()
    await db.refresh(compra)
    return {"id": compra.id, "status": compra.status, "total": compra.total}


@router.post("/{compra_id}/receber")
async def receber_compra(
    compra_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_estoque),
):
    """Confirma recebimento: entra estoque e atualiza custo dos produtos."""
    result = await db.execute(
        select(Compra).where(Compra.id == compra_id, Compra.status == "confirmado")
    )
    compra = result.scalar_one_or_none()
    if not compra:
        raise HTTPException(status_code=404, detail="Compra confirmada não encontrada")

    itens_result = await db.execute(select(ItemCompra).where(ItemCompra.compra_id == compra_id))
    itens = itens_result.scalars().all()

    now = datetime.utcnow()
    for item in itens:
        prod_result = await db.execute(
            select(Produto).where(Produto.id == item.produto_id)
        )
        produto = prod_result.scalar_one()
        saldo_antes = produto.estoque_atual
        saldo_depois = saldo_antes + item.quantidade

        produto.estoque_atual = saldo_depois
        produto.preco_custo = item.custo_unit
        produto.updated_at = now

        db.add(MovimentacaoEstoque(
            produto_id=produto.id,
            tipo="entrada",
            quantidade=item.quantidade,
            saldo_antes=saldo_antes,
            saldo_depois=saldo_depois,
            custo_unit=item.custo_unit,
            referencia_id=compra.id,
            referencia_tipo="compra",
            usuario_id=current_user.id,
            created_at=now,
        ))

    compra.status = "recebido"
    compra.updated_at = now
    await db.flush()

    return {"mensagem": "Compra recebida e estoque atualizado"}


# ── Importação de XML da NF-e ────────────────────────────────────────────────
# Fluxo em duas etapas: prévia (só leitura, mostra o que casou/não casou pro
# usuário conferir) e confirmar (aí sim grava). Depois de confirmado, a
# compra nasce com status "confirmado" — o passo de receber (acima) continua
# sendo o mesmo, então o estoque só entra quando o usuário confirmar o
# recebimento físico da mercadoria, igual ao lançamento manual.

class ItemNFePreviewOut(BaseModel):
    codigo: str
    ean: Optional[str]
    descricao: str
    unidade_nfe: str
    unidade_sugerida: str
    quantidade: Decimal
    valor_unitario: Decimal
    valor_total: Decimal
    produto_id: Optional[int]
    produto_nome: Optional[str]
    encontrado: bool


class FornecedorPreviewOut(BaseModel):
    cnpj: str
    razao_social: str
    id: Optional[int]
    existe: bool


class NFePreviewOut(BaseModel):
    chave_acesso: Optional[str]
    numero: str
    serie: str
    fornecedor: FornecedorPreviewOut
    itens: list[ItemNFePreviewOut]


async def _buscar_fornecedor_por_cnpj(db: AsyncSession, cnpj_formatado: str) -> Optional[Fornecedor]:
    forn = (await db.execute(select(Fornecedor).where(Fornecedor.cnpj == cnpj_formatado))).scalar_one_or_none()
    if forn is not None:
        return forn
    # Fallback: cadastros antigos podem ter o CNPJ sem formatação — compara só os dígitos.
    digitos = re.sub(r"\D", "", cnpj_formatado)
    if not digitos:
        return None
    todos = (await db.execute(select(Fornecedor))).scalars().all()
    return next((f for f in todos if re.sub(r"\D", "", f.cnpj or "") == digitos), None)


@router.post("/xml/previa", response_model=NFePreviewOut)
async def previa_importacao_xml(
    arquivo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_estoque),
):
    """Só leitura: lê o XML e mostra o que casaria, sem gravar nada."""
    if not arquivo.filename or not arquivo.filename.lower().endswith(".xml"):
        raise HTTPException(status_code=422, detail="Envie o arquivo .xml da NF-e (não o PDF/DANFE).")

    conteudo = await arquivo.read()
    if len(conteudo) > _TAMANHO_MAXIMO_XML:
        raise HTTPException(status_code=422, detail="Arquivo grande demais para ser uma NF-e (máx. 5 MB).")

    try:
        dados = parse_nfe_xml(conteudo)
    except NFeInvalidaError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    fornecedor = await _buscar_fornecedor_por_cnpj(db, dados.emitente_cnpj)

    itens_out = []
    for item in dados.itens:
        produto = None
        if item.ean:
            produto = (await db.execute(
                select(Produto).where(Produto.codigo_barras == item.ean)
            )).scalar_one_or_none()
        if produto is None and item.codigo:
            produto = (await db.execute(select(Produto).where(Produto.sku == item.codigo))).scalar_one_or_none()

        itens_out.append(ItemNFePreviewOut(
            codigo=item.codigo, ean=item.ean, descricao=item.descricao,
            unidade_nfe=item.unidade_nfe, unidade_sugerida=item.unidade_sugerida,
            quantidade=item.quantidade, valor_unitario=item.valor_unitario, valor_total=item.valor_total,
            produto_id=produto.id if produto else None,
            produto_nome=produto.nome if produto else None,
            encontrado=produto is not None,
        ))

    return NFePreviewOut(
        chave_acesso=dados.chave_acesso, numero=dados.numero, serie=dados.serie,
        fornecedor=FornecedorPreviewOut(
            cnpj=dados.emitente_cnpj, razao_social=dados.emitente_nome,
            id=fornecedor.id if fornecedor else None, existe=fornecedor is not None,
        ),
        itens=itens_out,
    )


class ItemXmlConfirmarIn(BaseModel):
    descricao: str
    ean: Optional[str] = None
    sku: Optional[str] = None
    quantidade: Decimal
    custo_unit: Decimal
    unidade_medida: str = "un"
    produto_id: Optional[int] = None    # produto já existente -> só usa
    categoria_id: Optional[int] = None  # produto novo -> obrigatório


class ConfirmarXmlRequest(BaseModel):
    fornecedor_id: Optional[int] = None       # fornecedor já cadastrado
    fornecedor_cnpj: Optional[str] = None     # fornecedor novo -> cria
    fornecedor_nome: Optional[str] = None
    nota_fiscal: Optional[str] = None
    itens: list[ItemXmlConfirmarIn]


@router.post("/xml/confirmar", status_code=201)
async def confirmar_importacao_xml(
    payload: ConfirmarXmlRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_estoque),
):
    """Grava de fato: cria fornecedor/produtos que faltarem e lança a compra
    (mesmo formato de `criar_compra`) já pronta para o recebimento confirmar
    o estoque."""
    if payload.fornecedor_id:
        fornecedor = (await db.execute(
            select(Fornecedor).where(Fornecedor.id == payload.fornecedor_id)
        )).scalar_one_or_none()
        if not fornecedor:
            raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    else:
        if not payload.fornecedor_cnpj or not payload.fornecedor_nome:
            raise HTTPException(
                status_code=422,
                detail="Informe fornecedor_id (já cadastrado) ou fornecedor_cnpj + fornecedor_nome (novo).",
            )
        fornecedor = await _buscar_fornecedor_por_cnpj(db, payload.fornecedor_cnpj)
        if fornecedor is None:
            now = datetime.utcnow()
            fornecedor = Fornecedor(
                razao_social=payload.fornecedor_nome, cnpj=payload.fornecedor_cnpj,
                ativo=True, created_at=now, updated_at=now,
            )
            db.add(fornecedor)
            await db.flush()

    itens_compra: list[ItemCompraIn] = []
    for item in payload.itens:
        if item.produto_id:
            produto_id = item.produto_id
        else:
            if not item.categoria_id:
                raise HTTPException(
                    status_code=422,
                    detail=f"O item \"{item.descricao}\" é um produto novo: informe categoria_id.",
                )
            novo = await criar_produto(
                ProdutoCreate(
                    codigo_barras=item.ean, sku=item.sku, nome=item.descricao,
                    categoria_id=item.categoria_id, fornecedor_id=fornecedor.id,
                    unidade_medida=item.unidade_medida,
                    preco_custo=item.custo_unit,
                    preco_venda=item.custo_unit,  # provisório — ajuste a margem depois em Produtos
                ),
                db, current_user,
            )
            produto_id = novo.id
        itens_compra.append(ItemCompraIn(produto_id=produto_id, quantidade=item.quantidade, custo_unit=item.custo_unit))

    return await criar_compra(
        CompraCreate(fornecedor_id=fornecedor.id, itens=itens_compra, nota_fiscal=payload.nota_fiscal),
        db, current_user,
    )
