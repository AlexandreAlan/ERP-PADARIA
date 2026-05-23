from .database import db
from datetime import datetime

class Cliente(db.Model):
    """Modelo de Cliente para cadastro de clientes e CPF na nota"""
    __tablename__ = 'clientes'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    cpf = db.Column(db.String(14), unique=True, nullable=True, index=True)
    telefone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    endereco = db.Column(db.String(200))
    ativo = db.Column(db.Boolean, default=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Converte o cliente para dicionário"""
        return {
            'id': self.id,
            'nome': self.nome,
            'cpf': self.cpf,
            'telefone': self.telefone,
            'email': self.email,
            'endereco': self.endereco,
            'ativo': self.ativo
        }

    def __repr__(self):
        return f'<Cliente {self.nome}>'
