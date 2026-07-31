"""Parser de XML de NF-e: lê emitente e itens de um XML sintético que segue
o schema padrão (nfeProc/NFe/infNFe), tanto completo (com protocolo) quanto
só o miolo <NFe>, e rejeita arquivo que não é NF-e."""

from decimal import Decimal

import pytest

from app.services.nfe_xml_service import parse_nfe_xml, NFeInvalidaError, formatar_cnpj, sugerir_unidade

_NFE_COMPLETA = """<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe35200714200166000187550010000000046200000040" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <natOp>Venda</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>46</nNF>
        <dhEmi>2026-01-15T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>14200166000187</CNPJ>
        <xNome>Distribuidora ABC Ltda</xNome>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>001</cProd>
          <cEAN>7891000100103</cEAN>
          <xProd>LEITE INTEGRAL 1L</xProd>
          <NCM>04012010</NCM>
          <uCom>CX</uCom>
          <qCom>10.0000</qCom>
          <vUnCom>45.5000000000</vUnCom>
          <vProd>455.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>002</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>FARINHA DE TRIGO 25KG</xProd>
          <uCom>SC</uCom>
          <qCom>5.0000</qCom>
          <vUnCom>80.0000000000</vUnCom>
          <vProd>400.00</vProd>
        </prod>
      </det>
    </infNFe>
  </NFe>
  <protNFe>
    <infProt>
      <chNFe>35200714200166000187550010000000046200000040</chNFe>
      <nProt>135200000012345</nProt>
    </infProt>
  </protNFe>
</nfeProc>
"""

_NFE_SEM_WRAPPER = """<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe35200714200166000187550010000000047200000041" versao="4.00">
    <ide><serie>1</serie><nNF>47</nNF></ide>
    <emit><CNPJ>14200166000187</CNPJ><xNome>Distribuidora ABC Ltda</xNome></emit>
    <det nItem="1">
      <prod>
        <cProd>010</cProd><cEAN>7891000000010</cEAN><xProd>PAO DE FORMA</xProd>
        <uCom>UN</uCom><qCom>3.0000</qCom><vUnCom>8.5000000000</vUnCom><vProd>25.50</vProd>
      </prod>
    </det>
  </infNFe>
</NFe>
"""


def test_parse_nfe_completa_com_protocolo():
    dados = parse_nfe_xml(_NFE_COMPLETA.encode("utf-8"))

    assert dados.numero == "46"
    assert dados.serie == "1"
    assert dados.emitente_nome == "Distribuidora ABC Ltda"
    assert dados.emitente_cnpj == "14.200.166/0001-87"
    assert dados.chave_acesso == "35200714200166000187550010000000046200000040"
    assert len(dados.itens) == 2

    leite, farinha = dados.itens
    assert leite.ean == "7891000100103"
    assert leite.quantidade == Decimal("10.0000")
    assert leite.valor_unitario == Decimal("45.5000000000")
    assert leite.valor_total == Decimal("455.00")

    # "SEM GTIN" (sem código de barras) vira None, não a string literal
    assert farinha.ean is None
    assert farinha.unidade_sugerida == "un"  # "SC" (saco) não mapeado -> cai no padrão


def test_parse_nfe_sem_wrapper_nfeproc_tambem_funciona():
    dados = parse_nfe_xml(_NFE_SEM_WRAPPER.encode("utf-8"))
    assert dados.numero == "47"
    assert len(dados.itens) == 1
    assert dados.itens[0].ean == "7891000000010"


def test_xml_sem_infnfe_e_rejeitado_com_mensagem_clara():
    with pytest.raises(NFeInvalidaError, match="infNFe"):
        parse_nfe_xml(b"<algumaCoisa><foo>bar</foo></algumaCoisa>")


def test_xml_invalido_e_rejeitado():
    with pytest.raises(NFeInvalidaError):
        parse_nfe_xml(b"isso nao e xml nenhum {}")


@pytest.mark.parametrize("entrada,esperado", [
    ("UN", "un"), ("kg", "kg"), ("Litro", "l"), ("PCT", "pct"), ("desconhecida", "un"),
])
def test_sugerir_unidade_mapeia_variantes_comuns(entrada, esperado):
    assert sugerir_unidade(entrada) == esperado


def test_formatar_cnpj():
    assert formatar_cnpj("14200166000187") == "14.200.166/0001-87"
    assert formatar_cnpj("123") == "123"  # tamanho inválido: devolve como veio
