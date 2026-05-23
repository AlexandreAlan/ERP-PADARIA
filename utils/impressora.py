"""
Módulo de integração com impressora térmica KP-IM602
Utiliza a biblioteca python-escpos para comunicação
"""

from escpos.printer import Usb, Network, Serial
from escpos.exceptions import USBError, SerialError
import logging

# Configuração de log
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configurações da impressora (ajustar conforme necessário)
# Para KP-IM602 USB - esses IDs podem variar, use 'python -m escpos.info' para listar
PRINTER_CONFIG = {
    'vendor_id': 0x0416,  # Winbond Electronics (comum em impressoras chinesas)
    'product_id': 0x5011,
    'in_ep': 0x81,
    'out_ep': 0x02,
}

# Cabeçalho padrão da padaria
CABECALHO_PADARIA = """
================================
    PADARIA E CONFEITARIA
       PÃO QUENTINHO
================================
CNPJ: 00.000.000/0001-00
Endereço: Rua das Flores, 123
Telefone: (11) 1234-5678
================================
"""

RODAPE_PADARIA = """
================================
    Obrigado pela preferência!
       Volte Sempre!
================================
"""


def get_printer():
    """
    Obtém uma instância da impressora
    Tenta conectar via USB primeiro, depois rede
    """
    # Tenta conexão USB
    try:
        printer = Usb(
            idVendor=PRINTER_CONFIG['vendor_id'],
            idProduct=PRINTER_CONFIG['product_id'],
            in_ep=PRINTER_CONFIG['in_ep'],
            out_ep=PRINTER_CONFIG['out_ep'],
        )
        logger.info("Impressora USB conectada com sucesso")
        return printer
    except Exception as e:
        logger.warning(f"Falha na conexão USB: {e}")

    # Tenta conexão de rede (se configurado)
    try:
        printer = Network(
            host='192.168.1.100',  # IP da impressora
            port=9100
        )
        logger.info("Impressora de rede conectada com sucesso")
        return printer
    except Exception as e:
        logger.warning(f"Falha na conexão de rede: {e}")

    # Tenta conexão serial
    try:
        printer = Serial(
            devfile='/dev/ttyUSB0',  # Linux
            # devfile='COM3',  # Windows
            baudrate=9600,
            bytesize=8,
            parity='N',
            stopbits=1,
            timeout=None
        )
        logger.info("Impressora serial conectada com sucesso")
        return printer
    except Exception as e:
        logger.error(f"Falha ao conectar impressora: {e}")
        raise Exception("Não foi possível conectar à impressora. Verifique as conexões.")


def imprimir_recibo(dados_venda):
    """
    Imprime um recibo não fiscal estruturado

    Args:
        dados_venda: Dicionário com dados da venda
            - codigo_venda: str
            - itens: list de dicts com produto, quantidade, preco_unitario, subtotal
            - subtotal: float
            - desconto: float
            - total: float
            - forma_pagamento: str
            - cpf_cliente: str (opcional)
            - data_venda: str
    """
    printer = get_printer()

    try:
        # Cabeçalho
        printer.text(CABECALHO_PADARIA)

        # Dados da venda
        data_venda = dados_venda.get('data_venda', '')
        if data_venda:
            data_formatada = data_venda[:16].replace('T', ' ')
        else:
            from datetime import datetime
            data_formatada = datetime.now().strftime('%d/%m/%Y %H:%M:%S')

        printer.text(f"Data: {data_formatada}\n")
        printer.text(f"Cupom: {dados_venda.get('codigo_venda', 'N/A')}\n")
        printer.text("-" * 32 + "\n")

        # Itens
        printer.text(f"{'QTD':<4} {'PRODUTO':<18} {'VLR':>6}\n")
        printer.text("-" * 32 + "\n")

        for item in dados_venda.get('itens', []):
            nome_produto = item.get('produto_nome', 'N/A')[:18]
            quantidade = item.get('quantidade', 1)
            preco = float(item.get('subtotal', 0))

            printer.text(f"{quantidade:<4} {nome_produto:<18} {preco:>6.2f}\n")

        printer.text("-" * 32 + "\n")

        # Totais
        subtotal = float(dados_venda.get('subtotal', 0))
        desconto = float(dados_venda.get('desconto', 0))
        total = float(dados_venda.get('total', 0))

        printer.text(f"Subtotal:        R$ {subtotal:>8.2f}\n")

        if desconto > 0:
            printer.text(f"Desconto:        R$ {desconto:>8.2f}\n")

        printer.text(f"{'TOTAL':<18} R$ {total:>8.2f}\n")
        printer.text(f"Forma Pgto: {dados_venda.get('forma_pagamento', 'Dinheiro')}\n")

        # CPF do cliente (se houver)
        cpf = dados_venda.get('cpf_cliente')
        if cpf:
            printer.text("-" * 32 + "\n")
            printer.text(f"CPF do Consumidor: {cpf}\n")

        # Rodapé
        printer.text(RODAPE_PADARIA)

        # Corte do papel
        printer.cut()

        logger.info("Recibo impresso com sucesso")

    except Exception as e:
        logger.error(f"Erro ao imprimir recibo: {e}")
        raise
    finally:
        printer.close()


def imprimir_teste():
    """Imprime uma página de teste"""
    printer = get_printer()

    try:
        printer.set(align='center', font='a', width=2, height=2)
        printer.text("TESTE DE IMPRESSÃO\n\n")
        printer.set()
        printer.text("Impressora funcionando corretamente!\n")
        printer.text(f"Data: {__import__('datetime').datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n")
        printer.cut()
        logger.info("Teste de impressão realizado com sucesso")
    except Exception as e:
        logger.error(f"Erro no teste de impressão: {e}")
        raise
    finally:
        printer.close()


def listar_impressoras_usb():
    """Lista impressoras USB disponíveis"""
    from escpos.printer import Usb
    return Usb.search()
