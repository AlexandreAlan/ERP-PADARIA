# Expose all models so Alembic can discover them
from app.models.usuario import Usuario
from app.models.produto import Produto, Categoria, Fornecedor
from app.models.venda import Venda, ItemVenda, Pagamento
from app.models.caixa import Caixa, SessaoCaixa, MovimentacaoCaixa
from app.models.estoque import MovimentacaoEstoque
from app.models.compra import Compra, ItemCompra
from app.models.auditoria import LogAuditoria
from app.models.configuracao import ConfiguracaoEmpresa
from app.models.cliente import Cliente

__all__ = [
    "Usuario",
    "Produto", "Categoria", "Fornecedor",
    "Venda", "ItemVenda", "Pagamento",
    "Caixa", "SessaoCaixa", "MovimentacaoCaixa",
    "MovimentacaoEstoque",
    "Compra", "ItemCompra",
    "LogAuditoria",
    "ConfiguracaoEmpresa",
    "Cliente",
]
