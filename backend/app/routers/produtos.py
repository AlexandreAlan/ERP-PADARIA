from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user, require_estoque
from app.models.usuario import Usuario
from app.models.produto import Produto, Categoria, Fornecedor
from app.schemas.produto import (
    ProdutoCreate, ProdutoUpdate, ProdutoRead, CategoriaCreate, CategoriaRead,
    FornecedorCreate, FornecedorRead,
)
from datetime import datetime

router = APIRouter()


# ── Produtos ────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ProdutoRead])
async def listar_produtos(
    q: Optional[str] = Query(None, description="Busca por nome ou código de barras"),
    categoria_id: Optional[int] = None,
    apenas_ativos: bool = True,
    estoque_baixo: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    stmt = select(Produto)
    if apenas_ativos:
        stmt = stmt.where(Produto.ativo.is_(True))
    if categoria_id:
        stmt = stmt.where(Produto.categoria_id == categoria_id)
    if q:
        stmt = stmt.where(or_(Produto.nome.ilike(f"%{q}%"), Produto.codigo_barras == q))
    if estoque_baixo:
        stmt = stmt.where(Produto.estoque_atual <= Produto.estoque_minimo, Produto.estoque_minimo > 0)

    result = await db.execute(stmt.order_by(Produto.nome))
    produtos = result.scalars().all()

    # Fetch all categorias and fornecedores once to avoid N+1
    cat_ids = {p.categoria_id for p in produtos if p.categoria_id}
    forn_ids = {p.fornecedor_id for p in produtos if p.fornecedor_id}

    cats: dict[int, str] = {}
    if cat_ids:
        cr = await db.execute(select(Categoria).where(Categoria.id.in_(cat_ids)))
        cats = {c.id: c.nome for c in cr.scalars().all()}

    forns: dict[int, str] = {}
    if forn_ids:
        fr = await db.execute(select(Fornecedor).where(Fornecedor.id.in_(forn_ids)))
        forns = {f.id: f.razao_social for f in fr.scalars().all()}

    return [
        ProdutoRead(
            id=p.id, codigo_barras=p.codigo_barras, sku=p.sku, nome=p.nome,
            descricao=p.descricao, categoria_id=p.categoria_id,
            categoria_nome=cats.get(p.categoria_id),
            fornecedor_id=p.fornecedor_id,
            fornecedor_nome=forns.get(p.fornecedor_id) if p.fornecedor_id else None,
            unidade_medida=p.unidade_medida, preco_custo=p.preco_custo,
            preco_venda=p.preco_venda, margem_lucro=p.margem_lucro,
            estoque_atual=p.estoque_atual, estoque_minimo=p.estoque_minimo,
            estoque_maximo=p.estoque_maximo, estoque_baixo=p.estoque_baixo,
            imagem_url=p.imagem_url, ativo=p.ativo,
        )
        for p in produtos
    ]


@router.get("/barcode/{codigo}", response_model=ProdutoRead)
async def buscar_por_barcode(
    codigo: str,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Endpoint crítico para o PDV — deve ser < 100ms."""
    result = await db.execute(
        select(Produto).where(Produto.codigo_barras == codigo, Produto.ativo.is_(True))
    )
    produto = result.scalar_one_or_none()
    if not produto:
        raise HTTPException(status_code=404, detail=f"Produto com código '{codigo}' não encontrado")
    return await _to_read(produto, db)


@router.get("/{produto_id}", response_model=ProdutoRead)
async def get_produto(
    produto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Produto).where(Produto.id == produto_id))
    produto = result.scalar_one_or_none()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return await _to_read(produto, db)


@router.post("", response_model=ProdutoRead, status_code=201)
async def criar_produto(
    payload: ProdutoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_estoque),
):
    await _check_duplicados(db, payload.codigo_barras, payload.sku)

    now = datetime.utcnow()
    produto = Produto(**payload.model_dump(), created_at=now, updated_at=now)
    db.add(produto)
    await db.flush()
    await db.refresh(produto)
    return await _to_read(produto, db)


@router.put("/{produto_id}", response_model=ProdutoRead)
async def atualizar_produto(
    produto_id: int,
    payload: ProdutoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_estoque),
):
    result = await db.execute(select(Produto).where(Produto.id == produto_id))
    produto = result.scalar_one_or_none()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    data = payload.model_dump(exclude_unset=True)
    novo_cb = data.get("codigo_barras") if "codigo_barras" in data and data["codigo_barras"] != produto.codigo_barras else None
    novo_sku = data.get("sku") if "sku" in data and data["sku"] != produto.sku else None
    if novo_cb or novo_sku:
        await _check_duplicados(db, novo_cb, novo_sku, ignorar_id=produto.id)

    for field, value in data.items():
        setattr(produto, field, value)
    produto.updated_at = datetime.utcnow()

    await db.flush()
    await db.refresh(produto)
    return await _to_read(produto, db)


@router.delete("/{produto_id}", status_code=204)
async def deletar_produto(
    produto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_estoque),
):
    result = await db.execute(select(Produto).where(Produto.id == produto_id))
    produto = result.scalar_one_or_none()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    produto.ativo = False
    produto.deleted_at = datetime.utcnow()
    await db.flush()


# ── Categorias ──────────────────────────────────────────────────────────────────

@router.get("/categorias/all", response_model=list[CategoriaRead])
async def listar_categorias(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    result = await db.execute(select(Categoria).where(Categoria.ativo.is_(True)).order_by(Categoria.nome))
    return result.scalars().all()


@router.post("/categorias", response_model=CategoriaRead, status_code=201)
async def criar_categoria(
    payload: CategoriaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_estoque),
):
    now = datetime.utcnow()
    cat = Categoria(nome=payload.nome, descricao=payload.descricao, created_at=now, updated_at=now)
    db.add(cat)
    await db.flush()
    await db.refresh(cat)
    return cat


# ── Fornecedores ────────────────────────────────────────────────────────────────

@router.get("/fornecedores/all", response_model=list[FornecedorRead])
async def listar_fornecedores(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    result = await db.execute(select(Fornecedor).where(Fornecedor.ativo.is_(True)).order_by(Fornecedor.razao_social))
    return result.scalars().all()


@router.post("/fornecedores", response_model=FornecedorRead, status_code=201)
async def criar_fornecedor(
    payload: FornecedorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_estoque),
):
    now = datetime.utcnow()
    forn = Fornecedor(**payload.model_dump(), ativo=True, created_at=now, updated_at=now)
    db.add(forn)
    await db.flush()
    await db.refresh(forn)
    return forn


# ── Helpers ─────────────────────────────────────────────────────────────────────

async def _check_duplicados(
    db: AsyncSession,
    codigo_barras: Optional[str],
    sku: Optional[str],
    ignorar_id: Optional[int] = None,
) -> None:
    """Pre-check antes de INSERT/UPDATE pra devolver 409 com mensagem clara
    em vez de IntegrityError 500. A unique key cobre ativos e soft-deleted."""
    cb = (codigo_barras or "").strip()
    sk = (sku or "").strip()

    if cb:
        stmt = select(Produto).where(Produto.codigo_barras == cb)
        if ignorar_id is not None:
            stmt = stmt.where(Produto.id != ignorar_id)
        existente = (await db.execute(stmt)).scalar_one_or_none()
        if existente:
            status = "ativo" if existente.ativo else "inativo (excluído)"
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Código de barras já cadastrado: '{cb}' pertence ao produto "
                    f"#{existente.id} — \"{existente.nome}\" ({status})."
                ),
            )

    if sk:
        stmt = select(Produto).where(Produto.sku == sk)
        if ignorar_id is not None:
            stmt = stmt.where(Produto.id != ignorar_id)
        existente = (await db.execute(stmt)).scalar_one_or_none()
        if existente:
            status = "ativo" if existente.ativo else "inativo (excluído)"
            raise HTTPException(
                status_code=409,
                detail=(
                    f"SKU já cadastrado: '{sk}' pertence ao produto "
                    f"#{existente.id} — \"{existente.nome}\" ({status})."
                ),
            )


async def _to_read(p: Produto, db: AsyncSession) -> ProdutoRead:
    cat_nome = None
    forn_nome = None
    if p.categoria_id:
        r = await db.execute(select(Categoria).where(Categoria.id == p.categoria_id))
        cat = r.scalar_one_or_none()
        cat_nome = cat.nome if cat else None
    if p.fornecedor_id:
        r = await db.execute(select(Fornecedor).where(Fornecedor.id == p.fornecedor_id))
        forn = r.scalar_one_or_none()
        forn_nome = forn.razao_social if forn else None

    return ProdutoRead(
        id=p.id, codigo_barras=p.codigo_barras, sku=p.sku, nome=p.nome,
        descricao=p.descricao, categoria_id=p.categoria_id, categoria_nome=cat_nome,
        fornecedor_id=p.fornecedor_id, fornecedor_nome=forn_nome,
        unidade_medida=p.unidade_medida, preco_custo=p.preco_custo,
        preco_venda=p.preco_venda, margem_lucro=p.margem_lucro,
        estoque_atual=p.estoque_atual, estoque_minimo=p.estoque_minimo,
        estoque_maximo=p.estoque_maximo, estoque_baixo=p.estoque_baixo,
        imagem_url=p.imagem_url, ativo=p.ativo,
    )
