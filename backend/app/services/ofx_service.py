"""
OfxService — Lê o extrato bancário no formato OFX (o que praticamente todo
banco brasileiro exporta como "extrato OFX"/"Money").

OFX 1.x é um SGML meio solto (tags de valor sem fechamento, ex.: `<TRNAMT>10.00`
sem `</TRNAMT>`), então em vez de tentar um parser SGML/XML genérico, extrai
cada bloco `<STMTTRN>...</STMTTRN>` (esse sempre fecha) e lê os campos de
dentro por regex — simples e robusto o bastante pro que interessa aqui.
"""

import re
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

_BLOCO_TRANSACAO = re.compile(r"<STMTTRN>(.*?)</STMTTRN>", re.IGNORECASE | re.DOTALL)


class OfxInvalidoError(Exception):
    """Arquivo não parece ser um extrato OFX válido."""


@dataclass
class LancamentoOfx:
    data: date
    valor: Decimal   # sempre positivo — o sinal vem de `tipo`
    tipo: str        # credito | debito
    descricao: str
    fitid: str | None


def _campo(bloco: str, tag: str) -> str | None:
    m = re.search(rf"<{tag}>\s*([^\r\n<]*)", bloco, re.IGNORECASE)
    if not m:
        return None
    valor = m.group(1).strip()
    return valor or None


def _parse_data(valor: str) -> date:
    # Formato OFX: YYYYMMDD[HHMMSS[.xxx[:TZ]]] — só os 8 primeiros dígitos interessam.
    digitos = re.sub(r"\D", "", valor)[:8]
    return datetime.strptime(digitos, "%Y%m%d").date()


def parse_ofx(conteudo: bytes) -> list[LancamentoOfx]:
    # Bancos BR costumam exportar em CP1252/Latin-1, não UTF-8.
    texto = conteudo.decode("latin-1", errors="replace")

    blocos = _BLOCO_TRANSACAO.findall(texto)
    if not blocos:
        raise OfxInvalidoError(
            "Nenhuma transação encontrada neste arquivo (tag <STMTTRN> ausente). "
            "Confira se é mesmo o extrato OFX exportado pelo banco."
        )

    lancamentos: list[LancamentoOfx] = []
    for bloco in blocos:
        dtposted = _campo(bloco, "DTPOSTED")
        trnamt = _campo(bloco, "TRNAMT")
        if not dtposted or not trnamt:
            continue
        try:
            valor_bruto = Decimal(trnamt.replace(",", "."))
        except InvalidOperation:
            continue

        descricao = _campo(bloco, "MEMO") or _campo(bloco, "NAME") or ""
        lancamentos.append(LancamentoOfx(
            data=_parse_data(dtposted),
            valor=abs(valor_bruto),
            tipo="credito" if valor_bruto >= 0 else "debito",
            descricao=descricao,
            fitid=_campo(bloco, "FITID"),
        ))

    if not lancamentos:
        raise OfxInvalidoError("As transações do arquivo não têm data ou valor válidos.")

    return lancamentos
