"""Parser de extrato OFX: lê data/valor/tipo/descrição de um arquivo sintético
no formato SGML solto (tags de valor sem fechamento) que os bancos exportam."""

from datetime import date
from decimal import Decimal

import pytest

from app.services.ofx_service import parse_ofx, OfxInvalidoError

_OFX = """OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>0001
<ACCTID>12345-6
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260705120000
<TRNAMT>150.00
<FITID>202607050001
<MEMO>PIX RECEBIDO JOAO SILVA
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260706120000
<TRNAMT>-45.90
<FITID>202607060001
<MEMO>TARIFA MANUTENCAO CONTA
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
"""


def test_parse_ofx_le_credito_e_debito():
    lancamentos = parse_ofx(_OFX.encode("latin-1"))

    assert len(lancamentos) == 2

    credito, debito = lancamentos
    assert credito.tipo == "credito"
    assert credito.valor == Decimal("150.00")
    assert credito.data == date(2026, 7, 5)
    assert credito.fitid == "202607050001"
    assert "PIX" in credito.descricao

    assert debito.tipo == "debito"
    assert debito.valor == Decimal("45.90")  # sempre positivo
    assert debito.descricao == "TARIFA MANUTENCAO CONTA"


def test_ofx_sem_transacao_e_rejeitado():
    with pytest.raises(OfxInvalidoError, match="STMTTRN"):
        parse_ofx(b"<OFX><BANKMSGSRSV1></BANKMSGSRSV1></OFX>")


def test_arquivo_qualquer_e_rejeitado():
    with pytest.raises(OfxInvalidoError):
        parse_ofx(b"isso aqui nao e um extrato de banco")
