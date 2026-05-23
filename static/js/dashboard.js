/**
 * Dashboard - ERP Padaria
 * Carrega dados e gráficos do dashboard
 */

document.addEventListener('DOMContentLoaded', function() {
    // Atualiza data atual
    document.getElementById('dataAtual').textContent = new Date().toLocaleDateString('pt-BR');

    // Carrega dados do dashboard
    carregarDashboard();
});

async function carregarDashboard() {
    try {
        const response = await fetch('/api/dashboard');
        const dados = await response.json();

        // Atualiza cards
        document.getElementById('faturamentoHoje').textContent =
            formatarMoeda(dados.faturamento_hoje);
        document.getElementById('vendasHoje').textContent = dados.vendas_hoje;
        document.getElementById('alertasEstoque').textContent = dados.alertas_estoque.length;
        document.getElementById('alertasVencimento').textContent = dados.alertas_vencimento.length;

        // Gráfico de Faturamento (7 dias)
        criarGraficoFaturamento(dados.faturamento_sete_dias);

        // Gráfico de Produtos Mais Vendidos
        criarGraficoProdutos(dados.produtos_mais_vendidos);

        // Lista de alertas de estoque
        renderizarAlertasEstoque(dados.alertas_estoque);

        // Lista de alertas de vencimento
        renderizarAlertasVencimento(dados.alertas_vencimento);

    } catch (erro) {
        console.error('Erro ao carregar dashboard:', erro);
    }
}

function criarGraficoFaturamento(dados) {
    const ctx = document.getElementById('graficoFaturamento').getContext('2d');

    const labels = dados.map(item => item[0]);
    const valores = dados.map(item => item[1]);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Faturamento (R$)',
                data: valores,
                backgroundColor: 'rgba(230, 126, 34, 0.7)',
                borderColor: 'rgba(230, 126, 34, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function criarGraficoProdutos(produtos) {
    const ctx = document.getElementById('graficoProdutos').getContext('2d');

    if (produtos.length === 0) {
        ctx.canvas.parentNode.innerHTML = '<p class="text-center" style="padding: 40px;">Sem dados de vendas no período</p>';
        return;
    }

    const labels = produtos.map(p => p.nome.substring(0, 15));
    const valores = produtos.map(p => p.total_vendido);

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: valores,
                backgroundColor: [
                    'rgba(230, 126, 34, 0.8)',
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(46, 204, 113, 0.8)',
                    'rgba(155, 89, 182, 0.8)',
                    'rgba(241, 196, 15, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderizarAlertasEstoque(produtos) {
    const container = document.getElementById('listaBaixoEstoque');

    if (produtos.length === 0) {
        container.innerHTML = '<p class="sem-alertas">Nenhum produto com baixo estoque</p>';
        return;
    }

    container.innerHTML = produtos.map(p => `
        <div class="item-alerta">
            <span>${p.nome}</span>
            <span class="status-badge status-baixo">Qtd: ${p.quantidade}</span>
        </div>
    `).join('');
}

function renderizarAlertasVencimento(produtos) {
    const container = document.getElementById('listaVencimento');

    if (produtos.length === 0) {
        container.innerHTML = '<p class="sem-alertas">Nenhum produto próximo do vencimento</p>';
        return;
    }

    container.innerHTML = produtos.map(p => {
        const validade = new Date(p.validade).toLocaleDateString('pt-BR');
        return `
            <div class="item-alerta">
                <span>${p.nome}</span>
                <span class="status-badge status-vencimento">Vence: ${validade}</span>
            </div>
        `;
    }).join('');
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}
