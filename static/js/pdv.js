/**
 * PDV - Frente de Caixa
 * Gerencia vendas, carrinho e integração com leitor de código de barras
 */

// Estado do PDV
let carrinho = [];
let produtoAtual = null;

document.addEventListener('DOMContentLoaded', function() {
    // Atualiza data atual
    document.getElementById('dataAtual').textContent = new Date().toLocaleDateString('pt-BR');

    // Configura event listeners
    configurarEventListeners();

    // Mantém foco no campo de código de barras
    manterFocoNoLeitor();
});

function configurarEventListeners() {
    const inputCodigoBarras = document.getElementById('codigoBarras');

    // Leitura do código de barras (funciona como teclado)
    inputCodigoBarras.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const codigo = this.value.trim();
            if (codigo) {
                buscarProduto(codigo);
                this.value = '';
            }
        }
    });

    // Perder foco - retorna o foco
    inputCodigoBarras.addEventListener('blur', function() {
        setTimeout(() => this.focus(), 100);
    });

    // Desconto
    document.getElementById('descontoValor').addEventListener('input', atualizarTotais);

    // Botões
    document.getElementById('btnFinalizarVenda').addEventListener('click', mostrarConfirmacao);
    document.getElementById('btnCancelar').addEventListener('click', cancelarVenda);
    document.getElementById('btnConfirmarVenda').addEventListener('click', finalizarVenda);
    document.getElementById('btnFecharModal').addEventListener('click', fecharModal);
    document.getElementById('btnNovaVenda').addEventListener('click', novaVenda);

    // CPF
    document.getElementById('btnConsultarCpf').addEventListener('click', consultarCpf);
    document.getElementById('cpfCliente').addEventListener('input', formatarCPF);
}

function manterFocoNoLeitor() {
    // Mantém o foco no campo de leitura
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.modal')) {
            document.getElementById('codigoBarras').focus();
        }
    });
}

async function buscarProduto(codigoBarras) {
    try {
        const response = await fetch(`/api/produtos?codigo_barras=${encodeURIComponent(codigoBarras)}`);

        if (response.status === 404) {
            alert('Produto não encontrado!');
            return;
        }

        const produto = await response.json();
        adicionarAoCarrinho(produto);

    } catch (erro) {
        console.error('Erro ao buscar produto:', erro);
        alert('Erro ao buscar produto. Tente novamente.');
    }
}

function adicionarAoCarrinho(produto) {
    // Verifica se produto já está no carrinho
    const itemExistente = carrinho.find(item => item.produto_id === produto.id);

    if (itemExistente) {
        itemExistente.quantidade += 1;
        itemExistente.subtotal = itemExistente.quantidade * itemExistente.preco_unitario;
    } else {
        carrinho.push({
            produto_id: produto.id,
            produto_nome: produto.nome,
            quantidade: 1,
            preco_unitario: produto.preco_venda,
            subtotal: produto.preco_venda
        });
    }

    // Atualiza UI
    renderizarCarrinho();
    atualizarUltimoProduto(produto);
    atualizarTotais();
}

function renderizarCarrinho() {
    const container = document.getElementById('carrinhoItens');

    if (carrinho.length === 0) {
        container.innerHTML = '<p class="carrinho-vazio">Nenhum item no carrinho</p>';
        document.getElementById('btnFinalizarVenda').disabled = true;
        return;
    }

    container.innerHTML = carrinho.map((item, index) => `
        <div class="carrinho-item">
            <span>${item.produto_nome}</span>
            <span>${item.quantidade}</span>
            <span>${formatarMoeda(item.preco_unitario)}</span>
            <span>${formatarMoeda(item.subtotal)}</span>
            <button class="btn-remover" onclick="removerItem(${index})">🗑️</button>
        </div>
    `).join('');

    document.getElementById('btnFinalizarVenda').disabled = false;
}

function removerItem(index) {
    carrinho.splice(index, 1);
    renderizarCarrinho();
    atualizarTotais();
    document.getElementById('codigoBarras').focus();
}

function atualizarUltimoProduto(produto) {
    const container = document.getElementById('ultimoProduto');
    document.getElementById('ultimoProdutoNome').textContent = produto.nome;
    document.getElementById('ultimoProdutoValor').textContent = formatarMoeda(produto.preco_venda);
    container.style.display = 'flex';
}

function atualizarTotais() {
    const subtotal = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
    const desconto = parseFloat(document.getElementById('descontoValor').value) || 0;
    const total = subtotal - desconto;

    document.getElementById('subtotalValor').textContent = formatarMoeda(subtotal);
    document.getElementById('totalValor').textContent = formatarMoeda(total);

    return { subtotal, desconto, total };
}

function mostrarConfirmacao() {
    if (carrinho.length === 0) return;

    document.getElementById('modalConfirmacao').style.display = 'flex';
}

function fecharModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

async function finalizarVenda() {
    const { subtotal, desconto, total } = atualizarTotais();

    const venda = {
        subtotal: subtotal,
        desconto: desconto,
        total: total,
        forma_pagamento: document.getElementById('formaPagamento').value,
        cpf_cliente: document.getElementById('cpfCliente').value.replace(/\D/g, ''),
        itens: carrinho
    };

    try {
        const response = await fetch('/api/vendas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(venda)
        });

        if (!response.ok) {
            throw new Error('Erro ao finalizar venda');
        }

        const dadosVenda = await response.json();

        // Imprime recibo
        imprimirRecibo(dadosVenda);

        // Mostra modal de sucesso
        document.getElementById('modalConfirmacao').style.display = 'none';
        document.getElementById('cupomNumero').textContent = dadosVenda.codigo_venda;
        document.getElementById('cupomTotal').textContent = formatarMoeda(dadosVenda.total);
        document.getElementById('modalSucesso').style.display = 'flex';

    } catch (erro) {
        console.error('Erro ao finalizar venda:', erro);
        alert('Erro ao finalizar venda. Tente novamente.');
        document.getElementById('modalConfirmacao').style.display = 'none';
    }
}

async function imprimirRecibo(dadosVenda) {
    try {
        await fetch('/api/imprimir/recibo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosVenda)
        });
    } catch (erro) {
        console.error('Erro ao imprimir recibo:', erro);
        // Não bloqueia a venda se a impressão falhar
    }
}

function novaVenda() {
    carrinho = [];
    renderizarCarrinho();
    atualizarTotais();
    document.getElementById('cpfCliente').value = '';
    document.getElementById('descontoValor').value = '0';
    document.getElementById('ultimoProduto').style.display = 'none';
    document.getElementById('modalSucesso').style.display = 'none';
    document.getElementById('codigoBarras').focus();
}

function cancelarVenda() {
    if (carrinho.length === 0) return;

    if (confirm('Deseja realmente cancelar esta venda?')) {
        novaVenda();
    }
}

async function consultarCpf() {
    const cpf = document.getElementById('cpfCliente').value.replace(/\D/g, '');

    if (!cpf) {
        alert('Digite um CPF');
        return;
    }

    try {
        const response = await fetch(`/api/clientes?cpf=${cpf}`);

        if (response.ok) {
            const cliente = await response.json();
            alert(`Cliente encontrado: ${cliente.nome}`);
        } else {
            const nome = prompt('CPF não cadastrado. Digite o nome do cliente para cadastro:');
            if (nome) {
                await fetch('/api/clientes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        nome: nome,
                        cpf: cpf
                    })
                });
                alert('Cliente cadastrado com sucesso!');
            }
        }
    } catch (erro) {
        console.error('Erro ao consultar CPF:', erro);
    }
}

function formatarCPF(e) {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length > 11) value = value.slice(0, 11);

    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    e.target.value = value;
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}
