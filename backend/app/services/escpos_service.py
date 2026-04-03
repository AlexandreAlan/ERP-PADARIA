"""
ESCPOSService — Gera o stream de bytes ESC/POS para impressoras térmicas.
Sem dependência de biblioteca externa neste módulo; apenas bytes puros.
Compatível com impressoras 80mm (42 colunas) e 58mm (32 colunas).
"""

from datetime import datetime
from decimal import Decimal
from dataclasses import dataclass
from typing import Optional
from app.config import get_settings

settings = get_settings()

# ── Constantes ESC/POS ─────────────────────────────────────────────────────────
ESC = b"\x1b"
GS  = b"\x1d"

INIT          = ESC + b"@"           # Inicializa impressora
ALIGN_LEFT    = ESC + b"a\x00"
ALIGN_CENTER  = ESC + b"a\x01"
ALIGN_RIGHT   = ESC + b"a\x02"
BOLD_ON       = ESC + b"E\x01"
BOLD_OFF      = ESC + b"E\x00"
FONT_NORMAL   = ESC + b"!\x00"
FONT_DOUBLE_H = ESC + b"!\x10"
FONT_DOUBLE   = ESC + b"!\x30"
UNDERLINE_ON  = ESC + b"-\x01"
UNDERLINE_OFF = ESC + b"-\x00"
LINE_FEED     = b"\n"
CUT_FULL      = GS + b"V\x00"        # Corte completo
CUT_PARTIAL   = GS + b"V\x01"        # Corte parcial (recomendado)

COLS_80MM = 42
COLS_58MM = 32


@dataclass
class ItemRecibo:
    nome: str
    quantidade: Decimal
    preco_unit: Decimal
    total_item: Decimal
    unidade: str = "un"


@dataclass
class DadosRecibo:
    numero_venda: int
    uuid_venda: str
    operador: str
    caixa_nome: str
    itens: list[ItemRecibo]
    subtotal: Decimal
    desconto: Decimal
    total: Decimal
    pagamentos: list[dict]   # [{"forma": "dinheiro", "valor": 20.00}]
    troco: Decimal
    data_hora: datetime


def gerar_recibo(dados: DadosRecibo) -> bytes:
    cols = COLS_80MM if settings.printer_paper_width >= 80 else COLS_58MM
    enc = "cp850"  # Codepage padrão para impressoras térmicas no Brasil

    def enc_line(text: str) -> bytes:
        return text.encode(enc, errors="replace") + LINE_FEED

    def sep(char: str = "-") -> bytes:
        return enc_line(char * cols)

    def center(text: str) -> bytes:
        return ALIGN_CENTER + enc_line(text)

    def left(text: str) -> bytes:
        return ALIGN_LEFT + enc_line(text)

    def right(text: str) -> bytes:
        return ALIGN_RIGHT + enc_line(text)

    def fmt_brl(value: Decimal) -> str:
        return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    def item_line(nome: str, qtd: Decimal, unit: str, preco: Decimal, total: Decimal) -> bytes:
        # Ex: "Pão Francês         2 un  R$ 0,60   R$ 1,20"
        qtd_str = f"{qtd:g} {unit}"
        preco_str = fmt_brl(preco)
        total_str = fmt_brl(total)
        nome_truncated = nome[:int(cols * 0.45)]
        line = f"{nome_truncated:<{int(cols*0.45)}} {qtd_str:>8} {preco_str:>9} {total_str:>9}"
        return ALIGN_LEFT + enc_line(line[:cols])

    def totals_line(label: str, value: str) -> bytes:
        line = f"{label:<{cols - len(value) - 1}}{value}"
        return ALIGN_LEFT + enc_line(line)

    # ── Monta buffer ───────────────────────────────────────────────────────────
    buf = bytearray()
    buf += INIT

    # Cabeçalho
    buf += center(settings.padaria_nome.upper())
    buf += center(f"CNPJ: {settings.padaria_cnpj}")
    if settings.padaria_endereco:
        buf += center(settings.padaria_endereco)
    if settings.padaria_cidade:
        buf += center(settings.padaria_cidade)
    if settings.padaria_telefone:
        buf += center(f"Tel: {settings.padaria_telefone}")
    buf += sep("=")
    buf += center("CUPOM NÃO FISCAL")
    buf += sep("=")

    # Info da venda
    buf += left(f"Venda: #{dados.numero_venda:06d}  {dados.data_hora.strftime('%d/%m/%Y %H:%M')}")
    buf += left(f"Operador: {dados.operador}  Caixa: {dados.caixa_nome}")
    buf += sep()

    # Cabeçalho de itens
    header = f"{'ITEM':<{int(cols*0.45)}} {'QTD':>8} {'UNIT':>9} {'TOTAL':>9}"
    buf += BOLD_ON + ALIGN_LEFT + enc_line(header[:cols]) + BOLD_OFF
    buf += sep()

    # Itens
    for item in dados.itens:
        buf += item_line(item.nome, item.quantidade, item.unidade, item.preco_unit, item.total_item)

    buf += sep()

    # Totais
    buf += totals_line("SUBTOTAL:", fmt_brl(dados.subtotal))
    if dados.desconto > 0:
        buf += totals_line("DESCONTO:", f"- {fmt_brl(dados.desconto)}")
    buf += BOLD_ON
    buf += totals_line("TOTAL:", fmt_brl(dados.total))
    buf += BOLD_OFF
    buf += sep()

    # Pagamentos
    forma_labels = {
        "dinheiro": "DINHEIRO",
        "cartao_credito": "CARTÃO CRÉDITO",
        "cartao_debito": "CARTÃO DÉBITO",
        "pix": "PIX",
        "vale": "VALE",
    }
    for pag in dados.pagamentos:
        label = forma_labels.get(pag["forma"], pag["forma"].upper())
        buf += totals_line(f"  {label}:", fmt_brl(Decimal(str(pag["valor"]))))

    if dados.troco > 0:
        buf += BOLD_ON
        buf += totals_line("TROCO:", fmt_brl(dados.troco))
        buf += BOLD_OFF

    buf += sep("=")

    # Rodapé
    buf += center(settings.padaria_mensagem_rodape)
    buf += center(f"UUID: {dados.uuid_venda[:18]}")
    buf += LINE_FEED * 3

    buf += CUT_PARTIAL

    return bytes(buf)


def enviar_para_impressora_usb(dados_bytes: bytes) -> bool:
    """
    Envia bytes para impressora USB via python-escpos.
    Retorna True se bem-sucedido.
    """
    try:
        from escpos.printer import Usb
        vendor_id = int(settings.printer_vendor_id, 16)
        product_id = int(settings.printer_product_id, 16)
        p = Usb(vendor_id, product_id, timeout=0)
        p._raw(dados_bytes)
        return True
    except Exception as exc:
        print(f"[ESCPOS] Erro ao imprimir via USB: {exc}")
        return False


def enviar_para_impressora_network(dados_bytes: bytes) -> bool:
    """Envia bytes via socket TCP para impressoras de rede."""
    import socket
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(5)
            s.connect((settings.printer_network_ip, settings.printer_network_port))
            s.sendall(dados_bytes)
        return True
    except Exception as exc:
        print(f"[ESCPOS] Erro ao imprimir via rede: {exc}")
        return False


def imprimir(dados: DadosRecibo) -> bool:
    buf = gerar_recibo(dados)
    tipo = settings.printer_type.lower()
    if tipo == "usb":
        return enviar_para_impressora_usb(buf)
    elif tipo == "network":
        return enviar_para_impressora_network(buf)
    elif tipo == "file":
        # Útil para debug: salva em arquivo
        with open("/tmp/ultimo_recibo.bin", "wb") as f:
            f.write(buf)
        return True
    return False
