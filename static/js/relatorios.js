/**
 * Relatórios - ERP Padaria
 */

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('dataAtual').textContent = new Date().toLocaleDateString('pt-BR');
    configurarEventListeners();

    // Define período padrão (últimos 7 dias)
    const hoje = new Date();
    const seteDiasAtras = new Date(hoje);
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    document.getElementById('dataFim').value = hoje.toISOString().split('T')[0];
    document.getElementById('dataInicio').value = seteDiasAtras.toISOString().split('T')[0];

    carregarRelatorio();
});

function configurarEventListeners() {
    document.getElementById('btnFiltrar').addEventListener('click', carregarRelatorio);
}

async function carregarRelatorio() {
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;

    if (!dataInicio || !dataFim) {
        alert('Selecione um período válido');
        return;
    }

    try {
        const response = await fetch(`/api/vendas?data_inicio=${dataInicio}&data_fim=${dataFim}`);
        const vendas = await response.json();

        renderizarTabela(vendas);
        atualizarResumo(vendas);
    } catch (erro) {
        console.error('Erro ao carregar relatório:', erro);
    }
}

function renderizarTabela(vendas) {
    const tbody = document.getElementById('tabelaVendas');

    if (vendas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma venda no período</td></tr>';
        return;
    }

    tbody.innerHTML = vendas.map(v => {
        const dataHora = v.data_venda ? new Date(v.data_venda).toLocaleString('pt-BR') : '-';
        const statusClass = v.status === 'finalizada' ? 'status-ok' : 'status-baixo';

        return `
            <tr>
                <td>${v.codigo_venda}</td>
                <td>${dataHora}</td>
                <td>${v.cpf_cliente || '-'}</td>
                <td>${v.forma_pagamento || '-'}</td>
                <td>${formatarMoeda(v.total)}</td>
                <td><span class="status-badge ${statusClass}">${v.status}</span></td>
            </tr>
        `;
    }).join('');
}

function atualizarResumo(vendas) {
    const totalVendas = vendas.reduce((acc, v) => acc + v.total, 0);
    const qtdVendas = vendas.length;
    const ticketMedio = qtdVendas > 0 ? totalVendas / qtdVendas : 0;

    document.getElementById('relTotalVendas').textContent = formatarMoeda(totalVendas);
    document.getElementById('relQtdVendas').textContent = qtdVendas;
    document.getElementById('relTicketMedio').textContent = formatarMoeda(ticketMedio);
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}
