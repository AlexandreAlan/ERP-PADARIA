"""Financeiro: importação de extrato OFX (com dedupe), sugestão e conciliação
manual de lançamentos, e cadastro de operadoras/taxas de cartão."""

from datetime import datetime
from decimal import Decimal
from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile

from app.routers.financeiro import (
    criar_conta, importar_ofx, listar_lancamentos, sugestoes_conciliacao,
    conciliar_lancamento, desconciliar_lancamento, criar_operadora, criar_taxa,
    calcular_valor_liquido, ContaBancariaCreate, ConciliarRequest,
    OperadoraCreate, TaxaCartaoCreate,
)
from app.schemas.venda import VendaCreate, ItemVendaCreate, PagamentoCreate
from app.services.venda_service import criar_venda
from tests.factories import criar_usuario, criar_sessao, criar_produto

_OFX = """<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260705120000
<TRNAMT>50.00
<FITID>FIT-001
<MEMO>PIX RECEBIDO
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260706120000
<TRNAMT>-12.00
<FITID>FIT-002
<MEMO>TARIFA
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>
"""


def _upload(conteudo: str = _OFX, nome: str = "extrato.ofx") -> UploadFile:
    return UploadFile(filename=nome, file=BytesIO(conteudo.encode("latin-1")))


async def test_importar_ofx_e_reimportar_nao_duplica(db):
    u = await criar_usuario(db, perfil="admin")
    conta = await criar_conta(ContaBancariaCreate(banco="Banco Teste", conta="1234-5"), db, u)

    r1 = await importar_ofx(conta.id, _upload(), db, u)
    assert r1["importados"] == 2
    assert r1["duplicados"] == 0

    r2 = await importar_ofx(conta.id, _upload(), db, u)
    assert r2["importados"] == 0
    assert r2["duplicados"] == 2

    lancamentos = await listar_lancamentos(conta.id, None, None, None, db, u)
    assert len(lancamentos) == 2


async def test_sugestao_casa_pix_por_valor_e_data(db):
    u = await criar_usuario(db, perfil="admin")
    s = await criar_sessao(db, u.id)
    p = await criar_produto(db, preco_venda="50.00", estoque="10")

    venda_payload = VendaCreate(
        sessao_id=s.id,
        itens=[ItemVendaCreate(produto_id=p.id, quantidade=Decimal("1"))],
        pagamentos=[PagamentoCreate(forma="pix", valor=Decimal("50.00"))],
    )
    await criar_venda(venda_payload, u.id, db)

    # OFX com a data de hoje (a venda acabou de ser criada "agora" pelo teste).
    hoje = datetime.utcnow().strftime("%Y%m%d")
    ofx_hoje = _OFX.replace("20260705120000", f"{hoje}120000")

    conta = await criar_conta(ContaBancariaCreate(banco="Banco Teste", conta="1234-5"), db, u)
    await importar_ofx(conta.id, _upload(ofx_hoje), db, u)

    lancamentos = await listar_lancamentos(conta.id, None, None, None, db, u)
    credito = next(lc for lc in lancamentos if lc.tipo == "credito")

    sugestoes = await sugestoes_conciliacao(credito.id, db, u)
    assert len(sugestoes) == 1
    assert sugestoes[0].valor == Decimal("50.00")


async def test_conciliar_e_desconciliar_lancamento(db):
    u = await criar_usuario(db, perfil="admin")
    conta = await criar_conta(ContaBancariaCreate(banco="Banco Teste", conta="1234-5"), db, u)
    await importar_ofx(conta.id, _upload(), db, u)
    lancamentos = await listar_lancamentos(conta.id, None, None, None, db, u)
    lanc_id = lancamentos[0].id

    await conciliar_lancamento(lanc_id, ConciliarRequest(tipo="ajuste_manual"), db, u)
    conciliados = await listar_lancamentos(conta.id, True, None, None, db, u)
    assert any(lc.id == lanc_id for lc in conciliados)

    await desconciliar_lancamento(lanc_id, db, u)
    pendentes = await listar_lancamentos(conta.id, False, None, None, db, u)
    assert any(lc.id == lanc_id for lc in pendentes)


async def test_conciliar_pagamento_inexistente_falha(db):
    u = await criar_usuario(db, perfil="admin")
    conta = await criar_conta(ContaBancariaCreate(banco="Banco Teste", conta="1234-5"), db, u)
    await importar_ofx(conta.id, _upload(), db, u)
    lancamentos = await listar_lancamentos(conta.id, None, None, None, db, u)

    with pytest.raises(HTTPException) as exc:
        await conciliar_lancamento(lancamentos[0].id, ConciliarRequest(tipo="pagamento", ref_id=99999), db, u)
    assert exc.value.status_code == 404


async def test_operadora_taxa_e_calculo_de_valor_liquido(db):
    u = await criar_usuario(db, perfil="admin")
    op = await criar_operadora(OperadoraCreate(nome="Stone"), db, u)
    await criar_taxa(op.id, TaxaCartaoCreate(
        bandeira="master", tipo="credito_parcelado", parcelas=3,
        taxa_percentual=Decimal("4.50"), dias_recebimento=30,
    ), db, u)

    resultado = await calcular_valor_liquido(
        operadora_id=op.id, bandeira="master", tipo="credito_parcelado", parcelas=3,
        valor_bruto=Decimal("200.00"), db=db, current_user=u,
    )
    # 200 * (1 - 0.045) = 191.00
    assert resultado["valor_liquido"] == Decimal("191.00")
    assert resultado["dias_recebimento"] == 30


async def test_taxa_duplicada_e_recusada(db):
    u = await criar_usuario(db, perfil="admin")
    op = await criar_operadora(OperadoraCreate(nome="Cielo"), db, u)
    dados = TaxaCartaoCreate(bandeira="visa", tipo="debito", parcelas=1,
                              taxa_percentual=Decimal("1.99"), dias_recebimento=1)
    await criar_taxa(op.id, dados, db, u)

    with pytest.raises(HTTPException) as exc:
        await criar_taxa(op.id, dados, db, u)
    assert exc.value.status_code == 409
