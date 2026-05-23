/**
 * Gestão de Estoque - ERP Padaria
 */

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('dataAtual').textContent = new Date().toLocaleDateString('pt-BR');
    configurarEventListeners();
    carregarEstoque();
});

function configurarEventListeners() {
    document.getElementById('filtroProduto').addEventListener('input', carregarEstoque);
    document.getElementById('filtroCategoria').addEventListener('input', carregarEstoque);
    document.getElementById('filtroStatus').addEventListener('input', carregarEstoque);

    document.getElementById('btnConfirmarMovimentacao').addEventListener('click', confirmarMovimentacao);
    document.getElementById('btnFecharModal').addEventListener('click', fecharModal);
}

async function carregarEstoque() {
    try {
        const response = await fetch('/api/produtos');
        const produtos = await response.json();

        const filtroNome = document.getElementById('filtroProduto').value.toLowerCase();
        const filtroCategoria = document.getElementById('filtroCategoria').value;
        const filtroStatus = document.getElementById('filtroStatus').value;

        const filtrados = produtos.filter(p => {
            const matchNome = p.nome.toLowerCase().includes(filtroNome);
            const matchCategoria = !filtroCategoria || p.categoria === filtroCategoria;

            let matchStatus = true;
            if (filtroStatus === 'baixo') {
                matchStatus = p.esta_baixo_estoque;
            } else if (filtroStatus === 'vencimento') {
                matchStatus = p.esta_proximo_vencimento || p.vencido;
            }

            return matchNome && matchCategoria && matchStatus;
        });

        renderizarTabela(filtrados);
    } catch (erro) {
        console.error('Erro ao carregar estoque:', erro);
    }
}

function renderizarTabela(produtos) {
    const tbody = document.getElementById('tabelaEstoque');

    if (produtos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Nenhum produto encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = produtos.map(p => {
        let status = '<span class="status-badge status-ok">OK</span>';
        if (p.vencido) {
            status = '<span class="status-badge status-vencido">VENCIDO</span>';
        } else if (p.esta_proximo_vencimento) {
            status = '<span class="status-badge status-vencimento">Próx. Vencimento</span>';
        } else if (p.esta_baixo_estoque) {
            status = '<span class="status-badge status-baixo">Baixo Estoque</span>';
        }

        const validade = p.validade ? new Date(p.validade).toLocaleDateString('pt-BR') : '-';

        return `
            <tr>
                <td>${p.nome}</td>
                <td>${p.codigo_barras}</td>
                <td>${p.categoria || '-'}</td>
                <td>${p.quantidade} ${p.unidade}</td>
                <td>${formatarMoeda(p.preco_venda)}</td>
                <td>${validade}</td>
                <td>${status}</td>
                <td>
                    <button class="btn-secundario" onclick="abrirModalMovimentacao(${p.id}, '${p.nome}', ${p.quantidade})">Movimentar</button>
                </td>
            </tr>
        `;
    }).join('');
}

function abrirModalMovimentacao(produtoId, produtoNome, quantidadeAtual) {
    document.getElementById('modalProdutoId').value = produtoId;
    document.getElementById('modalProdutoNome').textContent = `${produtoNome} (Atual: ${quantidadeAtual})`;
    document.getElementById('modalMovimentacao').style.display = 'flex';
}

async function confirmarMovimentacao() {
    const produtoId = document.getElementById('modalProdutoId').value;
    const tipo = document.getElementById('modalTipo').value;
    const quantidade = parseInt(document.getElementById('modalQuantidade').value);
    const motivo = document.getElementById('modalMotivo').value;
    const observacao = document.getElementById('modalObservacao').value;

    if (quantidade <= 0) {
        alert('Quantidade inválida');
        return;
    }

    try {
        const response = await fetch(`/api/produtos/${produtoId}/estoque`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo: tipo,
                quantidade: quantidade,
                motivo: motivo,
                observacao: observacao
            })
        });

        if (response.ok) {
            alert('Movimentação realizada com sucesso!');
            fecharModal();
            carregarEstoque();
        } else {
            const erro = await response.json();
            alert(erro.erro || 'Erro ao realizar movimentação');
        }
    } catch (erro) {
        console.error('Erro ao realizar movimentação:', erro);
        alert('Erro ao realizar movimentação');
    }
}

function fecharModal() {
    document.getElementById('modalMovimentacao').style.display = 'none';
    document.getElementById('modalProduto').style.display = 'none';
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}
