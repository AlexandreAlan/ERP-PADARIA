/**
 * Gestão de Clientes - ERP Padaria
 */

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('dataAtual').textContent = new Date().toLocaleDateString('pt-BR');
    configurarEventListeners();
    carregarClientes();
});

function configurarEventListeners() {
    document.getElementById('btnNovoCliente').addEventListener('click', () => abrirModalCliente());
    document.getElementById('btnSalvarCliente').addEventListener('click', salvarCliente);
    document.getElementById('btnFecharModal').addEventListener('click', fecharModal);

    document.getElementById('filtroCliente').addEventListener('input', carregarClientes);
    document.getElementById('filtroCpf').addEventListener('input', carregarClientes);
}

async function carregarClientes() {
    try {
        const response = await fetch('/api/clientes');
        const clientes = await response.json();

        const filtroNome = document.getElementById('filtroCliente').value.toLowerCase();
        const filtroCpf = document.getElementById('filtroCpf').value.replace(/\D/g, '');

        const filtrados = clientes.filter(c => {
            const matchNome = c.nome.toLowerCase().includes(filtroNome);
            const matchCpf = !filtroCpf || (c.cpf && c.cpf.replace(/\D/g, '').includes(filtroCpf));
            return matchNome && matchCpf;
        });

        renderizarTabela(filtrados);
    } catch (erro) {
        console.error('Erro ao carregar clientes:', erro);
    }
}

function renderizarTabela(clientes) {
    const tbody = document.getElementById('tabelaClientes');

    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum cliente encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = clientes.map(c => `
        <tr>
            <td>${c.nome}</td>
            <td>${c.cpf || '-'}</td>
            <td>${c.telefone || '-'}</td>
            <td>${c.email || '-'}</td>
            <td>
                <button class="btn-secundario" onclick="editarCliente(${c.id})">Editar</button>
            </td>
        </tr>
    `).join('');
}

function abrirModalCliente(cliente = null) {
    document.getElementById('modalCliente').style.display = 'flex';

    if (cliente) {
        document.getElementById('modalTitulo').textContent = 'Editar Cliente';
        document.getElementById('modalClienteId').value = cliente.id;
        document.getElementById('modalNome').value = cliente.nome;
        document.getElementById('modalCpf').value = cliente.cpf || '';
        document.getElementById('modalTelefone').value = cliente.telefone || '';
        document.getElementById('modalEmail').value = cliente.email || '';
        document.getElementById('modalEndereco').value = cliente.endereco || '';
    } else {
        document.getElementById('modalTitulo').textContent = 'Novo Cliente';
        document.getElementById('modalClienteId').value = '';
        document.getElementById('modalNome').value = '';
        document.getElementById('modalCpf').value = '';
        document.getElementById('modalTelefone').value = '';
        document.getElementById('modalEmail').value = '';
        document.getElementById('modalEndereco').value = '';
    }
}

async function salvarCliente() {
    const id = document.getElementById('modalClienteId').value;
    const cliente = {
        nome: document.getElementById('modalNome').value,
        cpf: document.getElementById('modalCpf').value.replace(/\D/g, '') || null,
        telefone: document.getElementById('modalTelefone').value,
        email: document.getElementById('modalEmail').value,
        endereco: document.getElementById('modalEndereco').value
    };

    if (!cliente.nome) {
        alert('Nome é obrigatório');
        return;
    }

    try {
        const url = id ? `/api/clientes/${id}` : '/api/clientes';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cliente)
        });

        if (!response.ok) {
            const erro = await response.json();
            alert(erro.erro || 'Erro ao salvar cliente');
            return;
        }

        alert('Cliente salvo com sucesso!');
        fecharModal();
        carregarClientes();
    } catch (erro) {
        console.error('Erro ao salvar cliente:', erro);
        alert('Erro ao salvar cliente');
    }
}

async function editarCliente(id) {
    try {
        const response = await fetch(`/api/clientes/${id}`);
        const cliente = await response.json();
        abrirModalCliente(cliente);
    } catch (erro) {
        console.error('Erro ao buscar cliente:', erro);
    }
}

function fecharModal() {
    document.getElementById('modalCliente').style.display = 'none';
}
