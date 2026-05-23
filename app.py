"""
Sistema de Gestão (ERP), Controle de Qualidade e PDV para Padaria
Backend Flask com integração de hardware
Interface visual para usuários analfabetos
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from flask_cors import CORS
from datetime import datetime, date, timedelta
from sqlalchemy import func
from functools import wraps
import os

from models.database import db, init_db
from models.produto import Produto
from models.estoque import MovimentacaoEstoque
from models.venda import Venda, ItemVenda
from models.cliente import Cliente
from models.usuario import Usuario


def create_app():
    """Factory para criar a aplicação Flask"""
    app = Flask(__name__)

    # Configurações
    app.config['SECRET_KEY'] = 'padaria-secret-key-2026-super-seguro'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///padaria.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ECHO'] = False

    # Inicializa extensões
    CORS(app)
    init_db(app)

    # Registra rotas
    register_routes(app)

    return app


def login_necessario(f):
    """Decorator para proteger rotas que exigem login"""
    @wraps(f)
    def decorada(*args, **kwargs):
        if 'usuario_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorada


def register_routes(app):
    """Registra todas as rotas da aplicação"""

    # ==================== ROTAS DE AUTENTICAÇÃO ====================

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        """Tela de login"""
        if request.method == 'POST':
            data = request.json if request.is_json else request.form

            username = data.get('username', '').strip()
            senha = data.get('senha', '').strip()

            if not username or not senha:
                if request.is_json:
                    return jsonify({'erro': 'Digite usuário e senha'}), 400
                flash('Digite usuário e senha', 'erro')
                return render_template('login.html')

            usuario = Usuario.query.filter_by(username=username, ativo=True).first()

            if usuario and usuario.verificar_senha(senha):
                session['usuario_id'] = usuario.id
                session['usuario_nome'] = usuario.nome
                session['usuario_avatar'] = usuario.avatar
                session['usuario_cargo'] = usuario.cargo

                # Atualiza último acesso
                usuario.ultimo_acesso = datetime.utcnow()
                db.session.commit()

                if request.is_json:
                    return jsonify({
                        'mensagem': 'Login realizado com sucesso',
                        'usuario': usuario.to_dict()
                    })
                return redirect(url_for('index'))
            else:
                if request.is_json:
                    return jsonify({'erro': 'Usuário ou senha incorretos'}), 401
                flash('Usuário ou senha incorretos', 'erro')

        return render_template('login.html')

    @app.route('/logout')
    def logout():
        """Faz logout do usuário"""
        session.clear()
        return redirect(url_for('login'))

    @app.route('/api/usuario/atual')
    def usuario_atual():
        """Retorna o usuário logado"""
        if 'usuario_id' not in session:
            return jsonify({'erro': 'Não autenticado'}), 401

        usuario = Usuario.query.get(session['usuario_id'])
        if usuario:
            return jsonify(usuario.to_dict())
        return jsonify({'erro': 'Usuário não encontrado'}), 404

    # ==================== ROTAS DE PÁGINAS ====================

    @app.route('/')
    @login_necessario
    def index():
        """Página inicial - Dashboard"""
        return render_template('index.html')

    @app.route('/pdv')
    @login_necessario
    def pdv():
        """Tela do PDV - Frente de Caixa"""
        return render_template('pdv.html')

    @app.route('/estoque')
    @login_necessario
    def estoque():
        """Tela de Gestão de Estoque"""
        return render_template('estoque.html')

    @app.route('/produtos')
    @login_necessario
    def produtos():
        """Tela de Cadastro de Produtos"""
        return render_template('produtos.html')

    @app.route('/clientes')
    @login_necessario
    def clientes():
        """Tela de Cadastro de Clientes"""
        return render_template('clientes.html')

    @app.route('/relatorios')
    @login_necessario
    def relatorios():
        """Tela de Relatórios"""
        return render_template('relatorios.html')

    @app.route('/usuarios')
    @login_necessario
    def usuarios():
        """Tela de Gestão de Usuários"""
        return render_template('usuarios.html')

    # ==================== API - PRODUTOS ====================

    @app.route('/api/produtos', methods=['GET'])
    @login_necessario
    def listar_produtos():
        """Lista todos os produtos ou busca por código de barras"""
        codigo_barras = request.args.get('codigo_barras')
        if codigo_barras:
            produto = Produto.query.filter_by(codigo_barras=codigo_barras, ativo=True).first()
            if produto:
                return jsonify(produto.to_dict())
            return jsonify({'erro': 'Produto não encontrado'}), 404

        produtos = Produto.query.filter_by(ativo=True).all()
        return jsonify([p.to_dict() for p in produtos])

    @app.route('/api/produtos', methods=['POST'])
    @login_necessario
    def cadastrar_produto():
        """Cadastra um novo produto"""
        data = request.json

        # Verifica se código de barras já existe
        existente = Produto.query.filter_by(codigo_barras=data['codigo_barras']).first()
        if existente:
            return jsonify({'erro': 'Código de barras já cadastrado'}), 400

        produto = Produto(
            nome=data['nome'],
            codigo_barras=data['codigo_barras'],
            preco_custo=data.get('preco_custo', 0),
            preco_venda=data.get('preco_venda', 0),
            quantidade=data.get('quantidade', 0),
            unidade=data.get('unidade', 'UN'),
            categoria=data.get('categoria'),
            validade=datetime.strptime(data['validade']).date() if data.get('validade') else None,
            estoque_minimo=data.get('estoque_minimo', 5)
        )

        db.session.add(produto)
        db.session.commit()

        # Registra entrada inicial de estoque
        movimentacao = MovimentacaoEstoque(
            produto_id=produto.id,
            tipo='entrada',
            quantidade=produto.quantidade,
            motivo='Cadastro Inicial',
            usuario=session.get('usuario_nome', 'admin')
        )
        db.session.add(movimentacao)
        db.session.commit()

        return jsonify(produto.to_dict()), 201

    @app.route('/api/produtos/<int:id>', methods=['GET'])
    @login_necessario
    def obter_produto(id):
        """Obtém um produto específico"""
        produto = Produto.query.get_or_404(id)
        return jsonify(produto.to_dict())

    @app.route('/api/produtos/<int:id>', methods=['PUT'])
    @login_necessario
    def atualizar_produto(id):
        """Atualiza um produto"""
        produto = Produto.query.get_or_404(id)
        data = request.json

        produto.nome = data.get('nome', produto.nome)
        produto.preco_custo = data.get('preco_custo', produto.preco_custo)
        produto.preco_venda = data.get('preco_venda', produto.preco_venda)
        produto.unidade = data.get('unidade', produto.unidade)
        produto.categoria = data.get('categoria', produto.categoria)
        produto.estoque_minimo = data.get('estoque_minimo', produto.estoque_minimo)

        if data.get('validade'):
            produto.validade = datetime.strptime(data['validade'], '%Y-%m-%d').date()

        db.session.commit()
        return jsonify(produto.to_dict())

    @app.route('/api/produtos/<int:id>', methods=['DELETE'])
    @login_necessario
    def excluir_produto(id):
        """Exclui (desativa) um produto"""
        produto = Produto.query.get_or_404(id)
        produto.ativo = False
        db.session.commit()
        return jsonify({'mensagem': 'Produto excluído com sucesso'})

    @app.route('/api/produtos/<int:id>/estoque', methods=['POST'])
    @login_necessario
    def ajustar_estoque(id):
        """Ajusta o estoque de um produto"""
        produto = Produto.query.get_or_404(id)
        data = request.json

        tipo = data.get('tipo')  # 'entrada' ou 'saida'
        quantidade = int(data.get('quantidade', 0))
        motivo = data.get('motivo', 'Ajuste')
        observacao = data.get('observacao')

        if tipo == 'entrada':
            produto.quantidade += quantidade
        elif tipo == 'saida':
            produto.quantidade = max(0, produto.quantidade - quantidade)
        else:
            return jsonify({'erro': 'Tipo de movimentação inválido'}), 400

        movimentacao = MovimentacaoEstoque(
            produto_id=produto.id,
            tipo=tipo,
            quantidade=quantidade,
            motivo=motivo,
            observacao=observacao,
            usuario=session.get('usuario_nome', 'admin')
        )

        db.session.add(movimentacao)
        db.session.commit()

        return jsonify(produto.to_dict())

    # ==================== API - VENDAS / PDV ====================

    @app.route('/api/vendas', methods=['POST'])
    @login_necessario
    def registrar_venda():
        """Registra uma nova venda"""
        data = request.json

        # Gera código único para venda
        codigo_venda = f"VD{datetime.now().strftime('%Y%m%d%H%M%S')}"

        venda = Venda(
            codigo_venda=codigo_venda,
            cpf_cliente=data.get('cpf_cliente'),
            subtotal=data.get('subtotal', 0),
            desconto=data.get('desconto', 0),
            total=data.get('total', 0),
            forma_pagamento=data.get('forma_pagamento', 'Dinheiro'),
            observacao=data.get('observacao')
        )

        db.session.add(venda)
        db.session.flush()

        # Adiciona itens da venda
        for item_data in data.get('itens', []):
            produto = Produto.query.get(item_data['produto_id'])
            if produto:
                item = ItemVenda(
                    venda_id=venda.id,
                    produto_id=produto.id,
                    quantidade=item_data['quantidade'],
                    preco_unitario=item_data['preco_unitario'],
                    subtotal=item_data['subtotal']
                )
                db.session.add(item)

                # Baixa no estoque
                movimentacao = MovimentacaoEstoque(
                    produto_id=produto.id,
                    tipo='saida',
                    quantidade=item_data['quantidade'],
                    motivo='Venda',
                    venda_id=venda.id,
                    usuario=session.get('usuario_nome', 'pdv')
                )
                db.session.add(movimentacao)

                # Atualiza quantidade do produto
                produto.quantidade -= item_data['quantidade']

        db.session.commit()

        return jsonify(venda.to_dict()), 201

    @app.route('/api/vendas', methods=['GET'])
    @login_necessario
    def listar_vendas():
        """Lista vendas com filtros opcionais"""
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')

        query = Venda.query

        if data_inicio:
            query = query.filter(Venda.data_venda >= datetime.strptime(data_inicio, '%Y-%m-%d'))
        if data_fim:
            query = query.filter(Venda.data_venda <= datetime.strptime(data_fim, '%Y-%m-%d') + timedelta(days=1))

        vendas = query.order_by(Venda.data_venda.desc()).limit(100).all()
        return jsonify([v.to_dict() for v in vendas])

    @app.route('/api/vendas/<int:id>', methods=['GET'])
    @login_necessario
    def obter_venda(id):
        """Obtém detalhes de uma venda"""
        venda = Venda.query.get_or_404(id)
        return jsonify(venda.to_dict())

    @app.route('/api/vendas/<int:id>/cancelar', methods=['POST'])
    @login_necessario
    def cancelar_venda(id):
        """Cancela uma venda e devolve produtos ao estoque"""
        venda = Venda.query.get_or_404(id)
        venda.status = 'cancelada'

        # Devolve produtos ao estoque
        for item in venda.itens:
            item.produto.quantidade += item.quantidade
            movimentacao = MovimentacaoEstoque(
                produto_id=item.produto.id,
                tipo='entrada',
                quantidade=item.quantidade,
                motivo='Devolução - Cancelamento Venda',
                venda_id=venda.id,
                usuario=session.get('usuario_nome', 'admin')
            )
            db.session.add(movimentacao)

        db.session.commit()
        return jsonify(venda.to_dict())

    # ==================== API - CLIENTES ====================

    @app.route('/api/clientes', methods=['GET'])
    @login_necessario
    def listar_clientes():
        """Lista todos os clientes ou busca por CPF"""
        cpf = request.args.get('cpf')
        if cpf:
            cliente = Cliente.query.filter_by(cpf=cpf, ativo=True).first()
            if cliente:
                return jsonify(cliente.to_dict())
            return jsonify({'erro': 'Cliente não encontrado'}), 404

        clientes = Cliente.query.filter_by(ativo=True).all()
        return jsonify([c.to_dict() for c in clientes])

    @app.route('/api/clientes', methods=['POST'])
    @login_necessario
    def cadastrar_cliente():
        """Cadastra um novo cliente"""
        data = request.json

        # Verifica se CPF já existe
        if data.get('cpf'):
            existente = Cliente.query.filter_by(cpf=data['cpf']).first()
            if existente:
                return jsonify({'erro': 'CPF já cadastrado'}), 400

        cliente = Cliente(
            nome=data['nome'],
            cpf=data.get('cpf'),
            telefone=data.get('telefone'),
            email=data.get('email'),
            endereco=data.get('endereco')
        )

        db.session.add(cliente)
        db.session.commit()

        return jsonify(cliente.to_dict()), 201

    # ==================== API - DASHBOARD ====================

    @app.route('/api/dashboard', methods=['GET'])
    @login_necessario
    def dados_dashboard():
        """Retorna dados para o dashboard"""
        hoje = date.today()
        inicio_hoje = datetime.combine(hoje, datetime.min.time())
        fim_hoje = datetime.combine(hoje, datetime.max.time())

        # Faturamento diário
        vendas_hoje = Venda.query.filter(
            Venda.data_venda >= inicio_hoje,
            Venda.data_venda <= fim_hoje,
            Venda.status == 'finalizada'
        ).all()
        faturamento_hoje = sum(v.total for v in vendas_hoje)

        # Faturamento dos últimos 7 dias
        sete_dias_atras = hoje - timedelta(days=6)
        inicio_sete_dias = datetime.combine(sete_dias_atras, datetime.min.time())
        vendas_sete_dias = Venda.query.filter(
            Venda.data_venda >= inicio_sete_dias,
            Venda.data_venda <= fim_hoje,
            Venda.status == 'finalizada'
        ).all()

        faturamento_por_dia = {}
        for i in range(7):
            dia = sete_dias_atras + timedelta(days=i)
            faturamento_por_dia[dia.strftime('%d/%m')] = 0

        for venda in vendas_sete_dias:
            dia_str = venda.data_venda.strftime('%d/%m')
            faturamento_por_dia[dia_str] += float(venda.total)

        # Produtos mais vendidos (últimos 7 dias)
        produtos_mais_vendidos = db.session.query(
            Produto.nome,
            func.sum(ItemVenda.quantidade).label('total_vendido')
        ).join(ItemVenda).join(Venda).filter(
            Venda.data_venda >= inicio_sete_dias,
            Venda.status == 'finalizada'
        ).group_by(Produto.id).order_by(
            func.sum(ItemVenda.quantidade).desc()
        ).limit(5).all()

        # Alertas de estoque
        produtos_baixo_estoque = Produto.query.filter(
            Produto.ativo == True,
            Produto.quantidade <= Produto.estoque_minimo
        ).all()

        # Produtos próximos do vencimento
        sete_dias_frente = hoje + timedelta(days=7)
        produtos_vencimento = Produto.query.filter(
            Produto.ativo == True,
            Produto.validade != None,
            Produto.validade <= sete_dias_frente,
            Produto.validade >= hoje
        ).all()

        return jsonify({
            'faturamento_hoje': float(faturamento_hoje),
            'vendas_hoje': len(vendas_hoje),
            'faturamento_sete_dias': list(faturamento_por_dia.items()),
            'produtos_mais_vendidos': [
                {'nome': p[0], 'total_vendido': p[1]}
                for p in produtos_mais_vendidos
            ],
            'alertas_estoque': [p.to_dict() for p in produtos_baixo_estoque],
            'alertas_vencimento': [p.to_dict() for p in produtos_vencimento]
        })

    # ==================== API - IMPRESSÃO ====================

    @app.route('/api/imprimir/recibo', methods=['POST'])
    @login_necessario
    def imprimir_recibo():
        """Envia recibo para impressão na impressora térmica"""
        from utils.impressora import imprimir_recibo

        data = request.json

        try:
            imprimir_recibo(data)
            return jsonify({'mensagem': 'Recibo enviado para impressão'})
        except Exception as e:
            return jsonify({'erro': str(e)}), 500

    @app.route('/api/imprimir/teste', methods=['POST'])
    @login_necessario
    def imprimir_teste():
        """Imprime página de teste"""
        from utils.impressora import imprimir_teste

        try:
            imprimir_teste()
            return jsonify({'mensagem': 'Teste de impressão realizado'})
        except Exception as e:
            return jsonify({'erro': str(e)}), 500

    # ==================== API - ESTOQUE ====================

    @app.route('/api/estoque/movimentacoes', methods=['GET'])
    @login_necessario
    def listar_movimentacoes():
        """Lista movimentações de estoque"""
        produto_id = request.args.get('produto_id')

        query = MovimentacaoEstoque.query

        if produto_id:
            query = query.filter_by(produto_id=produto_id)

        movimentacoes = query.order_by(MovimentacaoEstoque.data_movimentacao.desc()).limit(100).all()

        return jsonify([{
            'id': m.id,
            'produto_nome': m.produto.nome,
            'tipo': m.tipo,
            'quantidade': m.quantidade,
            'motivo': m.motivo,
            'observacao': m.observacao,
            'data_movimentacao': m.data_movimentacao.isoformat() if m.data_movimentacao else None
        } for m in movimentacoes])

    # ==================== API - USUÁRIOS ====================

    @app.route('/api/usuarios', methods=['GET'])
    @login_necessario
    def listar_usuarios():
        """Lista todos os usuários"""
        usuarios = Usuario.query.all()
        return jsonify([u.to_dict() for u in usuarios])

    @app.route('/api/usuarios', methods=['POST'])
    @login_necessario
    def cadastrar_usuario():
        """Cadastra um novo usuário"""
        data = request.json

        # Verifica se username já existe
        existente = Usuario.query.filter_by(username=data['username']).first()
        if existente:
            return jsonify({'erro': 'Nome de usuário já existe'}), 400

        usuario = Usuario(
            nome=data['nome'],
            username=data['username'],
            senha_hash=Usuario.gerar_hash_senha(data['senha']),
            cargo=data.get('cargo', 'caixa'),
            avatar=data.get('avatar', '👤')
        )

        db.session.add(usuario)
        db.session.commit()

        return jsonify(usuario.to_dict()), 201

    @app.route('/api/usuarios/<int:id>', methods=['PUT'])
    @login_necessario
    def atualizar_usuario(id):
        """Atualiza um usuário"""
        usuario = Usuario.query.get_or_404(id)
        data = request.json

        usuario.nome = data.get('nome', usuario.nome)
        usuario.cargo = data.get('cargo', usuario.cargo)
        usuario.avatar = data.get('avatar', usuario.avatar)
        usuario.ativo = data.get('ativo', usuario.ativo)

        if data.get('senha'):
            usuario.senha_hash = Usuario.gerar_hash_senha(data['senha'])

        db.session.commit()
        return jsonify(usuario.to_dict())


def create_sample_data():
    """Cria dados de exemplo para testes"""
    from app import create_app
    from models.database import db

    app = create_app()
    with app.app_context():
        # Cria usuário administrador padrão
        if Usuario.query.count() == 0:
            admin = Usuario(
                nome='Administrador',
                username='admin',
                senha_hash=Usuario.gerar_hash_senha('1234'),
                cargo='administrador',
                avatar='👨‍💼'
            )
            db.session.add(admin)

            # Cria usuário para caixa
            caixa = Usuario(
                nome='Operador Caixa',
                username='caixa',
                senha_hash=Usuario.gerar_hash_senha('1234'),
                cargo='caixa',
                avatar='🧑‍🍳'
            )
            db.session.add(caixa)

        # Verifica se já existem produtos
        if Produto.query.count() == 0:
            produtos_exemplo = [
                Produto(nome='Pão Francês', codigo_barras='7891000100103',
                       preco_custo=0.30, preco_venda=0.50, quantidade=500,
                       categoria='Padaria', estoque_minimo=100, unidade='UN'),
                Produto(nome='Pão de Leite', codigo_barras='7891000100202',
                       preco_custo=0.40, preco_venda=0.70, quantidade=200,
                       categoria='Padaria', estoque_minimo=50, unidade='UN'),
                Produto(nome='Bolo de Chocolate', codigo_barras='7891000100301',
                       preco_custo=8.00, preco_venda=15.00, quantidade=20,
                       categoria='Confeitaria', estoque_minimo=5, unidade='UN'),
                Produto(nome='Café Expresso', codigo_barras='7891000100400',
                       preco_custo=2.00, preco_venda=4.00, quantidade=100,
                       categoria='Bebidas', estoque_minimo=20, unidade='UN'),
                Produto(nome='Refrigerante Coca-Cola 350ml', codigo_barras='7891991000358',
                       preco_custo=2.50, preco_venda=5.00, quantidade=50,
                       categoria='Bebidas', estoque_minimo=24, unidade='UN'),
                Produto(nome='Sonho de Creme', codigo_barras='7891000100509',
                       preco_custo=3.00, preco_venda=6.00, quantidade=30,
                       categoria='Confeitaria', estoque_minimo=10, unidade='UN'),
                Produto(nome='Pão de Queijo', codigo_barras='7891000100608',
                       preco_custo=0.50, preco_venda=1.00, quantidade=200,
                       categoria='Padaria', estoque_minimo=50, unidade='UN'),
            ]

            for produto in produtos_exemplo:
                db.session.add(produto)

        db.session.commit()
        print("=" * 50)
        print("DADOS DE EXEMPLO CRIADOS!")
        print("=" * 50)
        print("Usuários criados:")
        print("  admin / 1234 (Administrador)")
        print("  caixa / 1234 (Operador)")
        print("=" * 50)


if __name__ == '__main__':
    # Cria a aplicação
    app = create_app()

    # Cria dados de exemplo se necessário
    create_sample_data()

    # Inicia o servidor
    print("=" * 50)
    print("SISTEMA ERP PADARIA")
    print("=" * 50)
    print("Servidor iniciado em: http://127.0.0.1:5000")
    print("Login padrão: admin / 1234")
    print("Pressione Ctrl+C para encerrar")
    print("=" * 50)

    app.run(host='127.0.0.1', port=5000, debug=True)
