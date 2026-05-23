/**
 * Gestão de Produtos - ERP Padaria
 */

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('dataAtual').textContent = new Date().toLocaleDateString('pt-BR');
    configurarEventListeners();
    carregarProdutos();
});

function configurarEventListeners() {
    document.getElementById('btnNovoProduto').addEventListener('click', () => abrirModalProduto());
    document.getElementById('btnSalvarProduto').addEventListener('click', salvarProduto);
    document.getElementById('btnFecharModal').addEventListener('click', fecharModal);

    document.getElementById('filtroProduto').addEventListener('input', carregarProdutos);
    document.getElementById('filtroCodigoBarras').addEventListener('input', carregarProdutos);
    document.getElementById('filtroCategoria').addEventListener('input', carregarProdutos);
}

async function carregarProdutos() {
    try {
        const response = await fetch('/api/produtos');
        const produtos = await response.json();

        const filtroNome = document.getElementById('filtroProduto').value.toLowerCase();
        const filtroCodigo = document.getElementById('filtroCodigoBarras').value.toLowerCase();
        const filtroCategoria = document.getElementById('filtroCategoria').value;

        const filtrados = produtos.filter(p => {
            const matchNome = p.nome.toLowerCase().includes(filtroNome);
            const matchCodigo = p.codigo_barras.toLowerCase().includes(filtroCodigo);
            const matchCategoria = !filtroCategoria || p.categoria === filtroCategoria;
            return matchNome && matchCodigo && matchCategoria;
        });

        renderizarTabela(filtrados);
    } catch (erro) {
        console.error('Erro ao carregar produtos:', erro);
    }
}

function renderizarTabela(produtos) {
    const tbody = document.getElementById('tabelaProdutos');

    if (produtos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum produto encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = produtos.map(p => `
        <tr>
            <td>${p.nome}</td>
            <td>${p.codigo_barras}</td>
            <td>${p.categoria || '-'}</td>
            <td>${formatarMoeda(p.preco_custo)}</td>
            <td>${formatarMoeda(p.preco_venda)}</td>
            <td>${p.quantidade} ${p.unidade}</td>
            <td>
                <button class="btn-secundario" onclick="editarProduto(${p.id})">Editar</button>
                <button class="btn-secundario" onclick="excluirProduto(${p.id})">Excluir</button>
            </td>
        </tr>
    `).join('');
}

function abrirModalProduto(produto = null) {
    document.getElementById('modalProduto').style.display = 'flex';

    if (produto) {
        document.getElementById('modalTitulo').textContent = 'Editar Produto';
        document.getElementById('modalProdutoId').value = produto.id;
        document.getElementById('modalNome').value = produto.nome;
        document.getElementById('modalCodigoBarras').value = produto.codigo_barras;
        document.getElementById('modalPrecoCusto').value = produto.preco_custo;
        document.getElementById('modalPrecoVenda').value = produto.preco_venda;
        document.getElementById('modalQuantidade').value = produto.quantidade;
        document.getElementById('modalUnidade').value = produto.unidade;
        document.getElementById('modalCategoria').value = produto.categoria || 'Padaria';
        document.getElementById('modalValidade').value = produto.validade || '';
        document.getElementById('modalEstoqueMinimo').value = produto.estoque_minimo;
    } else {
        document.getElementById('modalTitulo').textContent = 'Novo Produto';
        document.getElementById('modalProdutoId').value = '';
        document.getElementById('modalNome').value = '';
        document.getElementById('modalCodigoBarras').value = '';
        document.getElementById('modalPrecoCusto').value = '';
        document.getElementById('modalPrecoVenda').value = '';
        document.getElementById('modalQuantidade').value = '0';
        document.getElementById('modalUnidade').value = 'UN';
        document.getElementById('modalCategoria').value = 'Padaria';
        document.getElementById('modalValidade').value = '';
        document.getElementById('modalEstoqueMinimo').value = '5';
    }
}

async function salvarProduto() {
    const id = document.getElementById('modalProdutoId').value;
    const produto = {
        nome: document.getElementById('modalNome').value,
        codigo_barras: document.getElementById('modalCodigoBarras').value,
        preco_custo: parseFloat(document.getElementById('modalPrecoCusto').value) || 0,
        preco_venda: parseFloat(document.getElementById('modalPrecoVenda').value) || 0,
        quantidade: parseInt(document.getElementById('modalQuantidade').value) || 0,
        unidade: document.getElementById('modalUnidade').value,
        categoria: document.getElementById('modalCategoria').value,
        validade: document.getElementById('modalValidade').value || null,
        estoque_minimo: parseInt(document.getElementById('modalEstoqueMinimo').value) || 5
    };

    // Validação simples
    if (!produto.nome || !produto.codigo_barras) {
        alert('Preencha os campos obrigatórios');
        return;
    }

    try {
        const url = id ? `/api/produtos/${id}` : '/api/produtos';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(produto)
        });

        if (!response.ok) {
            const erro = await response.json();
            alert(erro.erro || 'Erro ao salvar produto');
            return;
        }

        alert('Produto salvo com sucesso!');
        fecharModal();
        carregarProdutos();
    } catch (erro) {
        console.error('Erro ao salvar produto:', erro);
        alert('Erro ao salvar produto');
    }
}

async function editarProduto(id) {
    try {
        const response = await fetch(`/api/produtos/${id}`);
        const produto = await response.json();
        abrirModalProduto(produto);
    } catch (erro) {
        console.error('Erro ao buscar produto:', erro);
    }
}

async function excluirProduto(id) {
    if (!confirm('Deseja realmente excluir este produto?')) return;

    try {
        const response = await fetch(`/api/produtos/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Produto excluído com sucesso!');
            carregarProdutos();
        }
    } catch (erro) {
        console.error('Erro ao excluir produto:', erro);
    }
}

function fecharModal() {
    document.getElementById('modalProduto').style.display = 'none';
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}
