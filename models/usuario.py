from .database import db
from datetime import datetime
import hashlib

class Usuario(db.Model):
    """Modelo de Usuário para login no sistema"""
    __tablename__ = 'usuarios'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    senha_hash = db.Column(db.String(128), nullable=False)
    cargo = db.Column(db.String(50))  # administrador, caixa, estoque
    avatar = db.Column(db.String(10))  # emoji do avatar
    ativo = db.Column(db.Boolean, default=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    ultimo_acesso = db.Column(db.DateTime, nullable=True)

    @staticmethod
    def gerar_hash_senha(senha):
        """Gera hash da senha usando SHA-256"""
        return hashlib.sha256(senha.encode()).hexdigest()

    def verificar_senha(self, senha):
        """Verifica se a senha está correta"""
        return self.senha_hash == self.gerar_hash_senha(senha)

    def to_dict(self):
        """Converte o usuário para dicionário"""
        return {
            'id': self.id,
            'nome': self.nome,
            'username': self.username,
            'cargo': self.cargo,
            'avatar': self.avatar,
            'ativo': self.ativo
        }

    def __repr__(self):
        return f'<Usuario {self.username}>'
