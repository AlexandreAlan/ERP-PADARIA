"""
NfeXmlService — Lê o XML da NF-e (o mesmo arquivo que o fornecedor manda
junto da mercadoria) e extrai fornecedor + itens, pra virar uma Compra sem
digitar nota por nota.

Aceita tanto o XML completo autorizado (`nfeProc`, com o protocolo) quanto
só o `NFe` (ou até só o `infNFe`) — procura o `infNFe` em qualquer lugar da
árvore, ignorando o namespace, então funciona nas duas formas que os
fornecedores costumam mandar.
"""

import re
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from xml.etree import ElementTree as ET  # nosec B405 — só o tipo Element; nunca chamamos fromstring/parse daqui (isso é feito só via defusedxml, abaixo)

import defusedxml.ElementTree as SafeET
from defusedxml.common import DefusedXmlException

_NS = "{http://www.portalfiscal.inf.br/nfe}"

# Unidades como o fornecedor costuma escrever na NF-e -> enum do sistema.
_MAPA_UNIDADE = {
    "un": "un", "und": "un", "unid": "un", "pc": "un", "pç": "un", "cx": "un",
    "kg": "kg", "kilo": "kg", "quilo": "kg",
    "g": "g", "gr": "g", "grama": "g",
    "l": "l", "lt": "l", "litro": "l",
    "ml": "ml",
    "pct": "pct", "pc t": "pct", "pacote": "pct", "fd": "pct", "fardo": "pct",
}


class NFeInvalidaError(Exception):
    """XML não parece ser uma NF-e válida (sem infNFe)."""


@dataclass
class ItemNFe:
    codigo: str
    ean: str | None
    descricao: str
    unidade_nfe: str
    unidade_sugerida: str
    quantidade: Decimal
    valor_unitario: Decimal
    valor_total: Decimal


@dataclass
class NFeDados:
    chave_acesso: str | None
    numero: str
    serie: str
    emitente_cnpj: str
    emitente_nome: str
    itens: list[ItemNFe] = field(default_factory=list)


def _local(tag: str) -> str:
    """Nome do elemento sem o prefixo de namespace: '{ns}infNFe' -> 'infNFe'."""
    return tag.rsplit("}", 1)[-1]


def _texto(elem: ET.Element | None, caminho: str) -> str | None:
    if elem is None:
        return None
    partes = caminho.split("/")
    xpath = "/".join(f"{_NS}{p}" for p in partes)
    achado = elem.find(xpath)
    return achado.text.strip() if achado is not None and achado.text else None


def _decimal(valor: str | None, padrao: str = "0") -> Decimal:
    if not valor:
        return Decimal(padrao)
    try:
        return Decimal(valor)
    except InvalidOperation:
        return Decimal(padrao)


def formatar_cnpj(cnpj_digitos: str) -> str:
    d = re.sub(r"\D", "", cnpj_digitos or "")
    if len(d) != 14:
        return cnpj_digitos or ""
    return f"{d[0:2]}.{d[2:5]}.{d[5:8]}/{d[8:12]}-{d[12:14]}"


def sugerir_unidade(unidade_nfe: str) -> str:
    return _MAPA_UNIDADE.get((unidade_nfe or "").strip().lower(), "un")


def parse_nfe_xml(conteudo: bytes) -> NFeDados:
    try:
        root = SafeET.fromstring(conteudo)
    except ET.ParseError as exc:
        raise NFeInvalidaError(f"Arquivo não é um XML válido: {exc}") from exc
    except DefusedXmlException as exc:
        raise NFeInvalidaError(
            "Arquivo XML recusado por segurança (contém DTD/entidades, que uma NF-e de verdade não usa)."
        ) from exc

    inf_nfe = None
    for elem in root.iter():
        if _local(elem.tag) == "infNFe":
            inf_nfe = elem
            break
    if inf_nfe is None:
        raise NFeInvalidaError(
            "Não encontrei os dados da NF-e neste arquivo (elemento <infNFe> ausente). "
            "Confira se é o XML da nota, não o PDF/DANFE."
        )

    emit = inf_nfe.find(f"{_NS}emit")
    ide = inf_nfe.find(f"{_NS}ide")

    chave_acesso = None
    id_attr = inf_nfe.get("Id") or ""
    if id_attr.upper().startswith("NFE") and len(id_attr) >= 47:
        chave_acesso = id_attr[3:47]
    if not chave_acesso:
        for elem in root.iter():
            if _local(elem.tag) == "chNFe" and elem.text:
                chave_acesso = elem.text.strip()
                break

    cnpj_emit = _texto(emit, "CNPJ") or ""
    nome_emit = _texto(emit, "xNome") or "Fornecedor não identificado"
    numero = _texto(ide, "nNF") or ""
    serie = _texto(ide, "serie") or ""

    itens: list[ItemNFe] = []
    for det in inf_nfe.findall(f"{_NS}det"):
        prod = det.find(f"{_NS}prod")
        if prod is None:
            continue
        ean = _texto(prod, "cEAN")
        if ean in (None, "", "SEM GTIN"):
            ean = None

        unidade_nfe = _texto(prod, "uCom") or "un"
        itens.append(ItemNFe(
            codigo=_texto(prod, "cProd") or "",
            ean=ean,
            descricao=_texto(prod, "xProd") or "(sem descrição)",
            unidade_nfe=unidade_nfe,
            unidade_sugerida=sugerir_unidade(unidade_nfe),
            quantidade=_decimal(_texto(prod, "qCom"), "0"),
            valor_unitario=_decimal(_texto(prod, "vUnCom"), "0"),
            valor_total=_decimal(_texto(prod, "vProd"), "0"),
        ))

    if not itens:
        raise NFeInvalidaError("A nota não tem nenhum item (<det>/<prod>) — nada para importar.")

    return NFeDados(
        chave_acesso=chave_acesso,
        numero=numero,
        serie=serie,
        emitente_cnpj=formatar_cnpj(cnpj_emit),
        emitente_nome=nome_emit,
        itens=itens,
    )
