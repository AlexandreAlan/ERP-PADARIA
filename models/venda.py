from .database import db
from datetime import datetime

class Venda(db.Model):
    """Modelo de Venda para registro de vendas no PDV"""
    __tablename__ = 'vendas'

    id = db.Column(db.Integer, primary_key=True)
    codigo_venda = db.Column(db.String(50), unique=True, nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=True)
    cpf_cliente = db.Column(db.String(14), nullable=True)
    subtotal = db.Column(db.Numeric(10, 2), default=0)
    desconto = db.Column(db.Numeric(10, 2), default=0)
    total = db.Column(db.Numeric(10, 2), default=0)
    forma_pagamento = db.Column(db.String(30))  # Dinheiro, Cartão, PIX, etc.
    status = db.Column(db.String(20), default='finalizada')  # finalizada, cancelada
    observacao = db.Column(db.Text)
    data_venda = db.Column(db.DateTime, default=datetime.utcnow)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    # Relacionamentos
    itens = db.relationship('ItemVenda', backref='venda', lazy='dynamic', cascade='all, delete-orphan')
    cliente = db.relationship('Cliente', backref='vendas')
    movimentacoes = db.relationship('MovimentacaoEstoque', backref='venda', lazy='dynamic')

    def to_dict(self):
        """Converte a venda para dicionário"""
        return {
            'id': self.id,
            'codigo_venda': self.codigo_venda,
            'cliente_id': self.cliente_id,
            'cpf_cliente': self.cpf_cliente,
            'subtotal': float(self.subtotal) if self.subtotal else 0,
            'desconto': float(self.desconto) if self.desconto else 0,
            'total': float(self.total) if self.total else 0,
            'forma_pagamento': self.forma_pagamento,
            'status': self.status,
            'data_venda': self.data_venda.isoformat() if self.data_venda else None,
            'itens': [item.to_dict() for item in self.itens]
        }

    def __repr__(self):
        return f'<Venda {self.codigo_venda}>'


class ItemVenda(db.Model):
    """Modelo de Item de Venda - produtos individuais em uma venda"""
    __tablename__ = 'itens_venda'

    id = db.Column(db.Integer, primary_key=True)
    venda_id = db.Column(db.Integer, db.ForeignKey('vendas.id'), nullable=False)
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False, default=1)
    preco_unitario = db.Column(db.Numeric(10, 2), nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)

    def to_dict(self):
        """Converte o item para dicionário"""
        return {
            'id': self.id,
            'produto_id': self.produto_id,
            'produto_nome': self.produto.nome if self.produto else 'N/A',
            'quantidade': self.quantidade,
            'preco_unitario': float(self.preco_unitario) if self.preco_unitario else 0,
            'subtotal': float(self.subtotal) if self.subtotal else 0
        }

    def __repr__(self):
        return f'<ItemVenda {self.quantidade}x {self.produto.nome if self.produto else "N/A"}>'
