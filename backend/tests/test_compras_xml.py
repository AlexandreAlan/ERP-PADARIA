"""Importação de XML de NF-e nas compras: prévia (só leitura, casa produto
por EAN/SKU) e confirmação (cria fornecedor/produto que faltar e lança a
compra do mesmo jeito que o lançamento manual — sem mexer em estoque até
o recebimento ser confirmado à parte)."""

from decimal import Decimal
from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile
from sqlalchemy import select

from app.models.produto import Categoria, Fornecedor
from app.models.compra import Compra
from app.routers.compras import (
    previa_importacao_xml, confirmar_importacao_xml, ConfirmarXmlRequest, ItemXmlConfirmarIn,
)
from tests.factories import criar_usuario, criar_produto

_NFE = """<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe35200714200166000187550010000000046200000040" versao="4.00">
      <ide><serie>1</serie><nNF>46</nNF></ide>
      <emit><CNPJ>14200166000187</CNPJ><xNome>Distribuidora ABC Ltda</xNome></emit>
      <det nItem="1">
        <prod>
          <cProd>001</cProd><cEAN>7891000100103</cEAN><xProd>LEITE INTEGRAL 1L</xProd>
          <uCom>CX</uCom><qCom>10.0000</qCom><vUnCom>4.5000000000</vUnCom><vProd>45.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>002</cProd><cEAN>SEM GTIN</cEAN><xProd>FARINHA DE TRIGO 25KG</xProd>
          <uCom>SC</uCom><qCom>5.0000</qCom><vUnCom>80.0000000000</vUnCom><vProd>400.00</vProd>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>
"""


def _upload(conteudo: str, nome: str = "nota.xml") -> UploadFile:
    return UploadFile(filename=nome, file=BytesIO(conteudo.encode("utf-8")))


async def test_previa_recusa_arquivo_sem_extensao_xml(db):
    u = await criar_usuario(db, perfil="admin")
    with pytest.raises(HTTPException) as exc:
        await previa_importacao_xml(_upload(_NFE, "nota.pdf"), db, u)
    assert exc.value.status_code == 422


async def test_previa_casa_produto_existente_por_ean_e_sinaliza_o_que_falta(db):
    u = await criar_usuario(db, perfil="admin")
    p = await criar_produto(db, preco_venda="6.00", estoque="0", nome="Leite Integral 1L")
    p.codigo_barras = "7891000100103"
    await db.flush()

    resultado = await previa_importacao_xml(_upload(_NFE), db, u)

    assert resultado.numero == "46"
    assert resultado.fornecedor.existe is False
    assert resultado.fornecedor.razao_social == "Distribuidora ABC Ltda"

    leite, farinha = resultado.itens
    assert leite.encontrado is True
    assert leite.produto_id == p.id
    assert farinha.encontrado is False
    assert farinha.produto_id is None


async def test_confirmar_cria_fornecedor_novo_e_produto_novo_e_lanca_a_compra(db):
    u = await criar_usuario(db, perfil="admin")
    cat = Categoria(nome="Mercearia")
    db.add(cat)
    await db.flush()

    payload = ConfirmarXmlRequest(
        fornecedor_cnpj="14.200.166/0001-87",
        fornecedor_nome="Distribuidora ABC Ltda",
        nota_fiscal="46",
        itens=[
            ItemXmlConfirmarIn(
                descricao="Farinha de Trigo 25kg", ean=None, sku="002",
                quantidade=Decimal("5"), custo_unit=Decimal("80.00"),
                unidade_medida="pct", categoria_id=cat.id,
            ),
        ],
    )

    resultado = await confirmar_importacao_xml(payload, db, u)

    assert resultado["status"] == "confirmado"
    compra = (await db.execute(
        select(Compra).where(Compra.id == resultado["id"])
    )).scalar_one()
    assert compra.nota_fiscal == "46"

    forn = (await db.execute(
        select(Fornecedor).where(Fornecedor.cnpj == "14.200.166/0001-87")
    )).scalar_one()
    assert forn.razao_social == "Distribuidora ABC Ltda"


async def test_confirmar_usa_produto_existente_quando_informado(db):
    u = await criar_usuario(db, perfil="admin")
    forn = Fornecedor(razao_social="Distribuidora ABC Ltda", cnpj="14.200.166/0001-87", ativo=True)
    db.add(forn)
    await db.flush()
    p = await criar_produto(db, preco_venda="6.00", estoque="20", nome="Leite Integral 1L")

    payload = ConfirmarXmlRequest(
        fornecedor_id=forn.id,
        itens=[
            ItemXmlConfirmarIn(
                descricao="Leite Integral 1L", ean="7891000100103",
                quantidade=Decimal("10"), custo_unit=Decimal("4.50"),
                produto_id=p.id,
            ),
        ],
    )

    resultado = await confirmar_importacao_xml(payload, db, u)
    assert resultado["status"] == "confirmado"

    # Estoque não muda ainda: só quando a compra for recebida (fluxo já existente).
    await db.refresh(p)
    assert p.estoque_atual == Decimal("20.000")


async def test_confirmar_exige_categoria_para_produto_novo(db):
    u = await criar_usuario(db, perfil="admin")
    payload = ConfirmarXmlRequest(
        fornecedor_cnpj="14.200.166/0001-87", fornecedor_nome="Distribuidora ABC Ltda",
        itens=[
            ItemXmlConfirmarIn(descricao="Produto Novo Sem Categoria",
                                quantidade=Decimal("1"), custo_unit=Decimal("10.00")),
        ],
    )
    with pytest.raises(HTTPException) as exc:
        await confirmar_importacao_xml(payload, db, u)
    assert exc.value.status_code == 422
    assert "categoria" in exc.value.detail.lower()
