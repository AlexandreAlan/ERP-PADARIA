from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_admin_gerente
from app.models.usuario import Usuario
from app.models.venda import Pagamento
from app.models.financeiro import ContaBancaria, LancamentoBancario, OperadoraCartao, TaxaCartao
from app.services.ofx_service import parse_ofx, OfxInvalidoError

router = APIRouter()

_TAMANHO_MAXIMO_OFX = 5 * 1024 * 1024  # 5 MB — extrato real nunca chega perto disso


# ── Contas bancárias ─────────────────────────────────────────────────────────

class ContaBancariaCreate(BaseModel):
    banco: str
    agencia: Optional[str] = None
    conta: str
    tipo: str = "corrente"


class ContaBancariaRead(BaseModel):
    id: int
    banco: str
    agencia: Optional[str]
    conta: str
    tipo: str
    ativo: bool

    model_config = {"from_attributes": True}


@router.get("/contas-bancarias", response_model=list[ContaBancariaRead])
async def listar_contas(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin_gerente)):
    result = await db.execute(select(ContaBancaria).where(ContaBancaria.ativo.is_(True)).order_by(ContaBancaria.banco))
    return result.scalars().all()


@router.post("/contas-bancarias", response_model=ContaBancariaRead, status_code=201)
async def criar_conta(
    payload: ContaBancariaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin_gerente),
):
    if payload.tipo not in {"corrente", "poupanca"}:
        raise HTTPException(status_code=422, detail="Tipo inválido. Use: corrente ou poupanca")
    conta = ContaBancaria(banco=payload.banco, agencia=payload.agencia, conta=payload.conta, tipo=payload.tipo)
    db.add(conta)
    await db.flush()
    await db.refresh(conta)
    return conta


# ── Importação de extrato OFX ────────────────────────────────────────────────

@router.post("/contas-bancarias/{conta_id}/importar-ofx")
async def importar_ofx(
    conta_id: int,
    arquivo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin_gerente),
):
    conta = (await db.execute(select(ContaBancaria).where(ContaBancaria.id == conta_id))).scalar_one_or_none()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta bancária não encontrada")

    if not arquivo.filename or not arquivo.filename.lower().endswith((".ofx", ".txt")):
        raise HTTPException(status_code=422, detail="Envie o arquivo .ofx exportado pelo internet banking.")

    conteudo = await arquivo.read()
    if len(conteudo) > _TAMANHO_MAXIMO_OFX:
        raise HTTPException(status_code=422, detail="Arquivo grande demais para ser um extrato (máx. 5 MB).")

    try:
        lancamentos = parse_ofx(conteudo)
    except OfxInvalidoError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Dedup pelo FITID (id único do banco) — reimportar o mesmo extrato não duplica.
    fitids = {lc.fitid for lc in lancamentos if lc.fitid}
    existentes: set[str] = set()
    if fitids:
        r = await db.execute(
            select(LancamentoBancario.fitid).where(
                LancamentoBancario.conta_bancaria_id == conta_id,
                LancamentoBancario.fitid.in_(fitids),
            )
        )
        existentes = {row[0] for row in r.all()}

    importados = 0
    duplicados = 0
    for lc in lancamentos:
        if lc.fitid and lc.fitid in existentes:
            duplicados += 1
            continue
        db.add(LancamentoBancario(
            conta_bancaria_id=conta_id, data=lc.data, descricao=lc.descricao,
            valor=lc.valor, tipo=lc.tipo, fitid=lc.fitid,
        ))
        importados += 1

    await db.flush()
    return {"importados": importados, "duplicados": duplicados, "total_no_arquivo": len(lancamentos)}


# ── Lançamentos e conciliação ─────────────────────────────────────────────────

class LancamentoRead(BaseModel):
    id: int
    conta_bancaria_id: int
    data: str
    descricao: str
    valor: Decimal
    tipo: str
    conciliado: bool
    conciliado_tipo: Optional[str]
    conciliado_ref_id: Optional[int]

    model_config = {"from_attributes": True}


@router.get("/lancamentos", response_model=list[LancamentoRead])
async def listar_lancamentos(
    conta_bancaria_id: Optional[int] = None,
    conciliado: Optional[bool] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin_gerente),
):
    stmt = select(LancamentoBancario)
    if conta_bancaria_id:
        stmt = stmt.where(LancamentoBancario.conta_bancaria_id == conta_bancaria_id)
    if conciliado is not None:
        stmt = stmt.where(LancamentoBancario.conciliado.is_(conciliado))
    if data_inicio:
        stmt = stmt.where(LancamentoBancario.data >= data_inicio)
    if data_fim:
        stmt = stmt.where(LancamentoBancario.data <= data_fim)

    result = await db.execute(stmt.order_by(LancamentoBancario.data.desc()).limit(500))
    itens = result.scalars().all()
    return [
        LancamentoRead(
            id=lc.id, conta_bancaria_id=lc.conta_bancaria_id, data=str(lc.data),
            descricao=lc.descricao, valor=lc.valor, tipo=lc.tipo,
            conciliado=lc.conciliado, conciliado_tipo=lc.conciliado_tipo,
            conciliado_ref_id=lc.conciliado_ref_id,
        )
        for lc in itens
    ]


class SugestaoOut(BaseModel):
    pagamento_id: int
    venda_id: int
    forma: str
    valor: Decimal
    data: str


@router.get("/lancamentos/{lancamento_id}/sugestoes", response_model=list[SugestaoOut])
async def sugestoes_conciliacao(
    lancamento_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin_gerente),
):
    """Sugere pagamentos em dinheiro/PIX com o mesmo valor, em até 2 dias de
    diferença, que ainda não foram usados em nenhuma conciliação. Cartão fica
    de fora da sugestão automática — o depósito da maquininha costuma juntar
    várias vendas de uma vez, então esse casamento é sempre manual."""
    lanc = (await db.execute(
        select(LancamentoBancario).where(LancamentoBancario.id == lancamento_id)
    )).scalar_one_or_none()
    if not lanc:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")
    if lanc.tipo != "credito":
        return []

    janela_inicio = lanc.data - timedelta(days=2)
    janela_fim = lanc.data + timedelta(days=2)

    ja_usados_result = await db.execute(
        select(LancamentoBancario.conciliado_ref_id).where(
            LancamentoBancario.conciliado_tipo == "pagamento",
            LancamentoBancario.conciliado_ref_id.is_not(None),
        )
    )
    ja_usados = {row[0] for row in ja_usados_result.all()}

    stmt = (
        select(Pagamento)
        .where(
            Pagamento.forma.in_(["pix", "dinheiro"]),
            Pagamento.valor == lanc.valor,
            Pagamento.status == "aprovado",
            Pagamento.created_at >= datetime.combine(janela_inicio, datetime.min.time()),
            Pagamento.created_at <= datetime.combine(janela_fim, datetime.max.time()),
        )
    )
    if ja_usados:
        stmt = stmt.where(Pagamento.id.not_in(ja_usados))

    pagamentos = (await db.execute(stmt)).scalars().all()
    return [
        SugestaoOut(
            pagamento_id=p.id, venda_id=p.venda_id, forma=p.forma,
            valor=p.valor, data=p.created_at.strftime("%Y-%m-%d %H:%M"),
        )
        for p in pagamentos
    ]


class ConciliarRequest(BaseModel):
    tipo: str  # pagamento | ajuste_manual
    ref_id: Optional[int] = None


@router.post("/lancamentos/{lancamento_id}/conciliar")
async def conciliar_lancamento(
    lancamento_id: int,
    payload: ConciliarRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin_gerente),
):
    if payload.tipo not in {"pagamento", "ajuste_manual"}:
        raise HTTPException(status_code=422, detail="Tipo inválido. Use: pagamento ou ajuste_manual")

    lanc = (await db.execute(
        select(LancamentoBancario).where(LancamentoBancario.id == lancamento_id)
    )).scalar_one_or_none()
    if not lanc:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")

    if payload.tipo == "pagamento":
        if not payload.ref_id:
            raise HTTPException(status_code=422, detail="Informe ref_id (id do pagamento)")
        pagamento = (await db.execute(select(Pagamento).where(Pagamento.id == payload.ref_id))).scalar_one_or_none()
        if not pagamento:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado")

    lanc.conciliado = True
    lanc.conciliado_tipo = payload.tipo
    lanc.conciliado_ref_id = payload.ref_id
    lanc.conciliado_em = datetime.utcnow()
    lanc.conciliado_por = current_user.id
    await db.flush()
    return {"mensagem": "Lançamento conciliado"}


@router.post("/lancamentos/{lancamento_id}/desconciliar")
async def desconciliar_lancamento(
    lancamento_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin_gerente),
):
    lanc = (await db.execute(
        select(LancamentoBancario).where(LancamentoBancario.id == lancamento_id)
    )).scalar_one_or_none()
    if not lanc:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")

    lanc.conciliado = False
    lanc.conciliado_tipo = None
    lanc.conciliado_ref_id = None
    lanc.conciliado_em = None
    lanc.conciliado_por = None
    await db.flush()
    return {"mensagem": "Conciliação desfeita"}


# ── Operadoras e taxas de cartão ──────────────────────────────────────────────

class OperadoraCreate(BaseModel):
    nome: str


class OperadoraRead(BaseModel):
    id: int
    nome: str
    ativo: bool

    model_config = {"from_attributes": True}


class TaxaCartaoCreate(BaseModel):
    bandeira: str
    tipo: str
    parcelas: int = 1
    taxa_percentual: Decimal
    dias_recebimento: int


class TaxaCartaoRead(BaseModel):
    id: int
    operadora_id: int
    bandeira: str
    tipo: str
    parcelas: int
    taxa_percentual: Decimal
    dias_recebimento: int

    model_config = {"from_attributes": True}


_BANDEIRAS_VALIDAS = {"visa", "master", "elo", "amex", "hipercard", "outra"}
_TIPOS_TAXA_VALIDOS = {"debito", "credito_vista", "credito_parcelado"}


@router.get("/operadoras", response_model=list[OperadoraRead])
async def listar_operadoras(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin_gerente)):
    result = await db.execute(select(OperadoraCartao).where(OperadoraCartao.ativo.is_(True)).order_by(OperadoraCartao.nome))
    return result.scalars().all()


@router.post("/operadoras", response_model=OperadoraRead, status_code=201)
async def criar_operadora(
    payload: OperadoraCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin_gerente),
):
    existente = (await db.execute(select(OperadoraCartao).where(OperadoraCartao.nome == payload.nome))).scalar_one_or_none()
    if existente:
        raise HTTPException(status_code=409, detail=f"Já existe uma operadora chamada \"{payload.nome}\"")
    op = OperadoraCartao(nome=payload.nome, ativo=True)
    db.add(op)
    await db.flush()
    await db.refresh(op)
    return op


@router.get("/operadoras/{operadora_id}/taxas", response_model=list[TaxaCartaoRead])
async def listar_taxas(
    operadora_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin_gerente),
):
    result = await db.execute(
        select(TaxaCartao).where(TaxaCartao.operadora_id == operadora_id)
        .order_by(TaxaCartao.bandeira, TaxaCartao.tipo, TaxaCartao.parcelas)
    )
    return result.scalars().all()


@router.post("/operadoras/{operadora_id}/taxas", response_model=TaxaCartaoRead, status_code=201)
async def criar_taxa(
    operadora_id: int,
    payload: TaxaCartaoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin_gerente),
):
    operadora = (await db.execute(select(OperadoraCartao).where(OperadoraCartao.id == operadora_id))).scalar_one_or_none()
    if not operadora:
        raise HTTPException(status_code=404, detail="Operadora não encontrada")
    if payload.bandeira not in _BANDEIRAS_VALIDAS:
        raise HTTPException(status_code=422, detail=f"Bandeira inválida. Use: {_BANDEIRAS_VALIDAS}")
    if payload.tipo not in _TIPOS_TAXA_VALIDOS:
        raise HTTPException(status_code=422, detail=f"Tipo inválido. Use: {_TIPOS_TAXA_VALIDOS}")
    if payload.parcelas < 1:
        raise HTTPException(status_code=422, detail="Parcelas deve ser pelo menos 1")

    existente = (await db.execute(
        select(TaxaCartao).where(
            TaxaCartao.operadora_id == operadora_id,
            TaxaCartao.bandeira == payload.bandeira,
            TaxaCartao.tipo == payload.tipo,
            TaxaCartao.parcelas == payload.parcelas,
        )
    )).scalar_one_or_none()
    if existente:
        raise HTTPException(status_code=409, detail="Já existe uma taxa cadastrada para essa combinação de bandeira/tipo/parcelas")

    taxa = TaxaCartao(operadora_id=operadora_id, **payload.model_dump())
    db.add(taxa)
    await db.flush()
    await db.refresh(taxa)
    return taxa


@router.delete("/taxas/{taxa_id}", status_code=204)
async def deletar_taxa(
    taxa_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin_gerente),
):
    taxa = (await db.execute(select(TaxaCartao).where(TaxaCartao.id == taxa_id))).scalar_one_or_none()
    if not taxa:
        raise HTTPException(status_code=404, detail="Taxa não encontrada")
    await db.delete(taxa)
    await db.flush()


@router.get("/taxas/calcular")
async def calcular_valor_liquido(
    operadora_id: int,
    bandeira: str,
    tipo: str,
    parcelas: int,
    valor_bruto: Decimal,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin_gerente),
):
    taxa = (await db.execute(
        select(TaxaCartao).where(
            TaxaCartao.operadora_id == operadora_id,
            TaxaCartao.bandeira == bandeira,
            TaxaCartao.tipo == tipo,
            TaxaCartao.parcelas == parcelas,
        )
    )).scalar_one_or_none()
    if not taxa:
        raise HTTPException(
            status_code=404,
            detail="Nenhuma taxa cadastrada para essa combinação de operadora/bandeira/tipo/parcelas",
        )

    valor_liquido = (valor_bruto * taxa.valor_liquido_fator).quantize(Decimal("0.01"))
    data_prevista = date.today() + timedelta(days=taxa.dias_recebimento)
    return {
        "taxa_percentual": taxa.taxa_percentual,
        "dias_recebimento": taxa.dias_recebimento,
        "valor_bruto": valor_bruto,
        "valor_liquido": valor_liquido,
        "data_recebimento_prevista": str(data_prevista),
    }
