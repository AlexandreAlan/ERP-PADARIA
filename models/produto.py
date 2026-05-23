from .database import db
from datetime import datetime, date

class Produto(db.Model):
    """Modelo de Produto para cadastro de mercadorias e insumos"""
    __tablename__ = 'produtos'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    codigo_barras = db.Column(db.String(50), unique=True, nullable=False, index=True)
    preco_custo = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    preco_venda = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    quantidade = db.Column(db.Integer, default=0)
    unidade = db.Column(db.String(20), default='UN')  # UN, KG, LT, etc.
    categoria = db.Column(db.String(50))  # Padaria, Frios, Bebidas, etc.
    validade = db.Column(db.Date, nullable=True)
    estoque_minimo = db.Column(db.Integer, default=5)
    ativo = db.Column(db.Boolean, default=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    movimentacoes = db.relationship('MovimentacaoEstoque', backref='produto', lazy='dynamic')
    itens_venda = db.relationship('ItemVenda', backref='produto', lazy='dynamic')

    @property
    def esta_baixo_estoque(self):
        """Verifica se o produto está abaixo do estoque mínimo"""
        return self.quantidade <= self.estoque_minimo

    @property
    def esta_proximo_vencimento(self):
        """Verifica se o produto está próximo do vencimento (7 dias)"""
        if not self.validade:
            return False
        hoje = date.today()
        dias_para_vencimento = (self.validade - hoje).days
        return dias_para_vencimento <= 7 and dias_para_vencimento >= 0

    @property
    def vencido(self):
        """Verifica se o produto está vencido"""
        if not self.validade:
            return False
        return self.validade < date.today()

    def to_dict(self):
        """Converte o produto para dicionário"""
        return {
            'id': self.id,
            'nome': self.nome,
            'codigo_barras': self.codigo_barras,
            'preco_custo': float(self.preco_custo) if self.preco_custo else 0,
            'preco_venda': float(self.preco_venda) if self.preco_venda else 0,
            'quantidade': self.quantidade,
            'unidade': self.unidade,
            'categoria': self.categoria,
            'validade': self.validade.isoformat() if self.validade else None,
            'estoque_minimo': self.estoque_minimo,
            'ativo': self.ativo,
            'esta_baixo_estoque': self.esta_baixo_estoque,
            'esta_proximo_vencimento': self.esta_proximo_vencimento,
            'vencido': self.vencido
        }

    def __repr__(self):
        return f'<Produto {self.nome}>'
