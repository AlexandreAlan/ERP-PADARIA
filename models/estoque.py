from .database import db
from datetime import datetime
from enum import Enum

class TipoMovimentacao(Enum):
    ENTRADA = 'entrada'
    SAIDA = 'saida'

class MovimentacaoEstoque(db.Model):
    """Modelo para controle de entradas e saídas de estoque"""
    __tablename__ = 'movimentacoes_estoque'

    id = db.Column(db.Integer, primary_key=True)
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)
    tipo = db.Column(db.String(20), nullable=False)  # 'entrada' ou 'saida'
    quantidade = db.Column(db.Integer, nullable=False, default=0)
    motivo = db.Column(db.String(100))  # Venda, Compra, Perda, Ajuste, etc.
    observacao = db.Column(db.Text)
    usuario = db.Column(db.String(50))
    data_movimentacao = db.Column(db.DateTime, default=datetime.utcnow)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    # Relacionamentos com venda (opcional)
    venda_id = db.Column(db.Integer, db.ForeignKey('vendas.id'), nullable=True)

    def __repr__(self):
        return f'<MovimentacaoEstoque {self.tipo} - {self.quantidade}>'
