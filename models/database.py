from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

def init_db(app):
    """Inicializa o banco de dados com a aplicação Flask"""
    db.init_app(app)
    with app.app_context():
        db.create_all()
    return db
