import { useState, useEffect, useRef } from 'react'

// ── Section data ──────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'visao-geral',    label: 'Visão Geral' },
  { id: 'pdv',            label: 'Frente de Caixa' },
  { id: 'caixa',          label: 'Caixa' },
  { id: 'estoque',        label: 'Estoque' },
  { id: 'dashboard',      label: 'Dashboard' },
  { id: 'relatorios',     label: 'Relatórios' },
  { id: 'auditoria',      label: 'Auditoria' },
  { id: 'configuracoes',  label: 'Configurações' },
  { id: 'perfis',         label: 'Perfis de Acesso' },
]

// ── Small primitives ──────────────────────────────────────────────────────────

function Tag({ children, color = 'green' }: { children: React.ReactNode; color?: 'green' | 'blue' | 'amber' | 'red' | 'purple' }) {
  const map = {
    green:  { bg: 'var(--clr-green-lite)',  color: 'var(--clr-green)',   border: 'var(--clr-border-2)' },
    blue:   { bg: '#EFF6FF',                color: '#1D4ED8',             border: '#BFDBFE' },
    amber:  { bg: '#FFFBEB',                color: '#B45309',             border: '#FCD34D' },
    red:    { bg: '#FEF2F2',                color: '#DC2626',             border: '#FCA5A5' },
    purple: { bg: '#F5F3FF',                color: '#6D28D9',             border: '#DDD6FE' },
  }
  const s = map[color]
  return (
    <span
      className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {children}
    </span>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
        style={{ background: 'var(--clr-green)', color: '#fff' }}
      >
        {n}
      </span>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>{children}</p>
    </div>
  )
}

function InfoBox({ title, children, color = 'blue' }: { title: string; children: React.ReactNode; color?: 'blue' | 'amber' | 'green' }) {
  const map = {
    blue:  { bg: '#EFF6FF', border: '#BFDBFE', icon: '#1D4ED8', title: '#1E3A5F' },
    amber: { bg: '#FFFBEB', border: '#FCD34D', icon: '#B45309', title: '#78350F' },
    green: { bg: 'var(--clr-green-lite)', border: 'var(--clr-border-2)', icon: 'var(--clr-green)', title: 'var(--clr-green)' },
  }
  const s = map[color]
  return (
    <div className="rounded-xl p-4 text-sm leading-relaxed" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <p className="font-bold mb-1" style={{ color: s.title }}>{title}</p>
      <div style={{ color: 'var(--clr-text)' }}>{children}</div>
    </div>
  )
}

function SectionTitle({ id, icon, children }: { id: string; icon: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-xl font-black flex items-center gap-2 scroll-mt-6"
      style={{ color: 'var(--clr-text)' }}
    >
      <span className="text-2xl">{icon}</span>
      {children}
    </h2>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-wider mt-6 mb-2" style={{ color: 'var(--clr-text-muted)' }}>
      {children}
    </h3>
  )
}

function FeatureGrid({ items }: { items: { icon: string; title: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
      {items.map(item => (
        <div
          key={item.title}
          className="flex gap-3 p-3 rounded-xl"
          style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)' }}
        >
          <span className="text-xl shrink-0">{item.icon}</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--clr-text)' }}>{item.title}</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--clr-text-muted)' }}>{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Section components ────────────────────────────────────────────────────────

function SecVisaoGeral() {
  return (
    <section className="space-y-4">
      <SectionTitle id="visao-geral" icon="📋">Visão Geral do Sistema</SectionTitle>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>
        O <strong>Nexshell</strong> é um sistema de gestão completo para padarias e confeitarias. Reúne frente de caixa (PDV), controle de estoque, relatórios gerenciais e auditoria em uma única plataforma web — acessível de qualquer dispositivo, sem instalação.
      </p>
      <FeatureGrid items={[
        { icon: '🖥️', title: 'Frente de Caixa',  desc: 'Realize vendas rapidamente com catálogo visual, leitura de código de barras e múltiplas formas de pagamento.' },
        { icon: '📦', title: 'Estoque',           desc: 'Gerencie produtos, categorias e quantidades. O sistema controla entradas e saídas automaticamente.' },
        { icon: '💰', title: 'Caixa',             desc: 'Abra e feche o caixa por turno, registre suprimentos e sangrias, veja o resumo financeiro do dia.' },
        { icon: '📊', title: 'Dashboard',         desc: 'Acompanhe vendas do dia, faturamento, alertas de estoque e análise ABC dos produtos em tempo real.' },
        { icon: '📈', title: 'Relatórios',        desc: 'Extraia relatórios de vendas por período, forma de pagamento, produto e operador.' },
        { icon: '🔐', title: 'Auditoria',         desc: 'Rastreie todas as ações realizadas no sistema: quem fez, o quê e quando.' },
      ]} />
      <InfoBox title="Acesso por perfil" color="blue">
        Cada usuário acessa apenas os módulos compatíveis com seu perfil. Veja a seção <strong>Perfis de Acesso</strong> para detalhes.
      </InfoBox>
    </section>
  )
}

function SecPDV() {
  return (
    <section className="space-y-4">
      <SectionTitle id="pdv" icon="🖥️">Frente de Caixa (PDV)</SectionTitle>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>
        A Frente de Caixa é onde as vendas são realizadas. O operador seleciona produtos, aplica descontos e finaliza o pagamento — tudo em poucos cliques.
      </p>

      <InfoBox title="Pré-requisito: caixa aberto" color="amber">
        Antes de vender, é necessário que haja uma sessão de caixa aberta. Se nenhum caixa estiver aberto, o sistema bloqueará o PDV e solicitará abertura. Qualquer usuário com acesso ao módulo <strong>Caixa</strong> pode abrir a sessão — outros operadores também conseguirão vender nela.
      </InfoBox>

      <SubTitle>Como realizar uma venda</SubTitle>
      <div className="space-y-2.5">
        <Step n={1}>Use a barra de pesquisa para buscar produtos por nome ou código de barras. Se houver leitor de código de barras USB, apenas passe o produto — ele é detectado automaticamente.</Step>
        <Step n={2}>Clique no card do produto para adicioná-lo ao carrinho. Produtos repetidos aumentam a quantidade automaticamente.</Step>
        <Step n={3}>No painel "Seu Pedido" (lateral direita no desktop, botão flutuante no celular), ajuste quantidades, aplique desconto por item ou desconto geral na venda.</Step>
        <Step n={4}>Clique em <strong>Finalizar Compra</strong> e selecione a forma de pagamento.</Step>
        <Step n={5}>Para pagamentos com cartão (crédito ou débito), selecione a <strong>maquineta</strong> utilizada (1 a 4). Isso registra em qual conta o valor foi recebido.</Step>
        <Step n={6}>Confirme o pagamento. O estoque é deduzido automaticamente e a venda é registrada.</Step>
      </div>

      <SubTitle>Filtros de produto</SubTitle>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>
        Use as <strong>pílulas de categoria</strong> abaixo da busca para filtrar rapidamente por tipo de produto (ex.: Pães, Bebidas, Salgados). Clique em "Tudo" para exibir todos os itens.
      </p>

      <SubTitle>Formas de pagamento</SubTitle>
      <div className="flex flex-wrap gap-2 mt-1">
        {['Dinheiro','Cartão de Crédito','Cartão de Débito','Pix'].map(f => (
          <Tag key={f} color="blue">{f}</Tag>
        ))}
      </div>
      <p className="text-sm leading-relaxed mt-2" style={{ color: 'var(--clr-text)' }}>
        É possível dividir o pagamento entre múltiplas formas. Ex.: parte em dinheiro, parte no crédito.
      </p>

      <SubTitle>Maquinetas</SubTitle>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>
        O estabelecimento possui 4 maquinetas, cada uma em uma conta bancária diferente. Ao pagar com crédito ou débito, o operador deve selecionar qual maquineta foi usada. Isso aparece nos relatórios para facilitar a conciliação financeira.
      </p>

      <InfoBox title="Desconto" color="green">
        O desconto pode ser aplicado em <strong>percentual (%)</strong> ou em <strong>valor fixo (R$)</strong>. Há desconto por item individual e desconto geral na venda. Os dois são somados no cálculo do total.
      </InfoBox>
    </section>
  )
}

function SecCaixa() {
  return (
    <section className="space-y-4">
      <SectionTitle id="caixa" icon="💰">Caixa</SectionTitle>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>
        O módulo de Caixa controla o fluxo financeiro por turno. Cada "sessão de caixa" representa um turno de trabalho — da abertura até o fechamento.
      </p>

      <SubTitle>Abrir o caixa</SubTitle>
      <div className="space-y-2.5">
        <Step n={1}>Acesse o módulo <strong>Caixa</strong> no menu lateral.</Step>
        <Step n={2}>Clique em <strong>Abrir Caixa</strong>.</Step>
        <Step n={3}>Informe o <strong>fundo de troco</strong> — o valor em dinheiro disponível na gaveta no início do turno.</Step>
        <Step n={4}>Confirme. A partir desse momento, vendas podem ser realizadas no PDV.</Step>
      </div>

      <SubTitle>Durante o turno</SubTitle>
      <FeatureGrid items={[
        { icon: '➕', title: 'Suprimento',  desc: 'Registre entradas de dinheiro no caixa durante o turno (ex.: reposição de troco).' },
        { icon: '➖', title: 'Sangria',      desc: 'Registre retiradas de dinheiro do caixa (ex.: pagamento de fornecedor em espécie).' },
        { icon: '📋', title: 'Resumo',       desc: 'Visualize o total vendido, valores por forma de pagamento e saldo atual do caixa.' },
      ]} />

      <SubTitle>Fechar o caixa</SubTitle>
      <div className="space-y-2.5">
        <Step n={1}>Clique em <strong>Fechar Caixa</strong>.</Step>
        <Step n={2}>Informe o valor em dinheiro que está fisicamente no caixa (contagem manual).</Step>
        <Step n={3}>O sistema calcula a diferença entre o esperado e o informado, registrando sobra ou falta.</Step>
        <Step n={4}>A sessão é encerrada e não aceita mais vendas.</Step>
      </div>

      <InfoBox title="Sessão compartilhada" color="blue">
        Se o caixa foi aberto pelo gerente ou admin, os operadores de caixa também podem vender nessa sessão — não é necessário que cada um abra o seu próprio.
      </InfoBox>
    </section>
  )
}

function SecEstoque() {
  return (
    <section className="space-y-4">
      <SectionTitle id="estoque" icon="📦">Estoque</SectionTitle>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>
        O módulo de Estoque centraliza o cadastro de produtos e o controle de quantidades. As entradas e saídas são registradas automaticamente conforme vendas e compras são processadas.
      </p>

      <SubTitle>Cadastro de produto</SubTitle>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>
        Para adicionar um produto, clique em <strong>Novo Produto</strong> e preencha os campos:
      </p>
      <FeatureGrid items={[
        { icon: '🏷️', title: 'Nome',             desc: 'Nome do produto como aparecerá no PDV e nos relatórios.' },
        { icon: '🔢', title: 'Código de Barras',  desc: 'Opcional. Permite que o produto seja encontrado ao passar no leitor de código de barras.' },
        { icon: '📁', title: 'Categoria',         desc: 'Classifica o produto para filtros no PDV e relatórios.' },
        { icon: '💵', title: 'Preço de Custo',    desc: 'Quanto o produto custa para o estabelecimento. Usado no cálculo de margem.' },
        { icon: '💰', title: 'Preço de Venda',    desc: 'Preço cobrado do cliente. Exibido no PDV.' },
        { icon: '📏', title: 'Unidade de Medida', desc: '"un" para itens contáveis (pães, latas) ou "kg" para peso.' },
        { icon: '📊', title: 'Estoque Atual',     desc: 'Quantidade em estoque no momento do cadastro.' },
        { icon: '⚠️', title: 'Estoque Mínimo',    desc: 'Limite abaixo do qual o sistema emite alerta. Se não houver limite, deixe 0.' },
      ]} />

      <SubTitle>Status automático do estoque</SubTitle>
      <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--clr-text)' }}>
        O sistema calcula automaticamente o nível de estoque de cada produto com base no estoque atual versus o mínimo configurado:
      </p>
      <div className="space-y-2">
        {[
          { tag: 'Desastre',  color: 'red'    as const, rule: 'Estoque = 0 (sem nenhuma unidade)' },
          { tag: 'Crítico',   color: 'red'    as const, rule: 'Estoque ≤ 30% do mínimo configurado' },
          { tag: 'Atenção',   color: 'amber'  as const, rule: 'Estoque entre 30% e 100% do mínimo' },
          { tag: 'Bom',       color: 'green'  as const, rule: 'Estoque entre 100% e 200% do mínimo (ou qualquer quantidade se mínimo = 0)' },
          { tag: 'Excelente', color: 'green'  as const, rule: 'Estoque acima de 200% do mínimo' },
        ].map(s => (
          <div key={s.tag} className="flex items-center gap-3">
            <Tag color={s.color}>{s.tag}</Tag>
            <span className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>{s.rule}</span>
          </div>
        ))}
      </div>

      <SubTitle>Ajuste manual de estoque</SubTitle>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>
        Use o botão <strong>Ajustar</strong> em qualquer produto para registrar uma entrada ou saída manual (ex.: avaria, doação, contagem física). O campo aceita valores com vírgula — ex.: <code className="text-xs px-1 rounded" style={{ background: 'var(--clr-bg)' }}>2,5</code> para 2,5 kg.
      </p>

      <SubTitle>Categorias</SubTitle>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>
        Acesse a aba <strong>Categorias</strong> dentro de Estoque para criar, editar e organizar categorias em hierarquia (pai → filho). As categorias aparecem como filtros de pílula no PDV.
      </p>

      <InfoBox title="Entrada automática via Compras" color="green">
        Ao registrar uma compra de fornecedor no módulo Estoque (aba Compras), o sistema soma automaticamente as quantidades recebidas no estoque dos produtos correspondentes.
      </InfoBox>
    </section>
  )
}

function SecDashboard() {
  return (
    <section className="space-y-4">
      <SectionTitle id="dashboard" icon="📊">Dashboard</SectionTitle>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>
        O Dashboard oferece uma visão gerencial em tempo real do negócio — ideal para o início do dia ou para consultas rápidas durante o expediente.
      </p>

      <FeatureGrid items={[
        { icon: '💵', title: 'Faturamento do Dia',      desc: 'Total bruto de vendas realizadas hoje, atualizado em tempo real.' },
        { icon: '🧾', title: 'Número de Vendas',        desc: 'Quantidade de transações concluídas no dia.' },
        { icon: '🛒', title: 'Ticket Médio',            desc: 'Valor médio por venda do dia (faturamento ÷ número de vendas).' },
        { icon: '📉', title: 'Alertas de Estoque',      desc: 'Produtos com status Atenção, Crítico ou Desastre aparecem aqui para ação imediata.' },
        { icon: '📊', title: 'Vendas por Hora',         desc: 'Gráfico de barras mostrando a distribuição das vendas ao longo do dia.' },
        { icon: '🏆', title: 'Curva ABC de Produtos',   desc: 'Ranking dos produtos mais vendidos em quantidade e faturamento.' },
      ]} />

      <InfoBox title="Atualização automática" color="blue">
        Os dados do Dashboard são atualizados automaticamente a cada 30 segundos. Não é necessário recarregar a página.
      </InfoBox>
    </section>
  )
}

function SecRelatorios() {
  return (
    <section className="space-y-4">
      <SectionTitle id="relatorios" icon="📈">Relatórios</SectionTitle>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>
        O módulo de Relatórios permite analisar o desempenho do negócio em qualquer período. Filtre, visualize e exporte os dados conforme necessário.
      </p>

      <FeatureGrid items={[
        { icon: '📅', title: 'Relatório de Vendas',       desc: 'Todas as vendas de um período, com detalhes de itens, formas de pagamento e operador.' },
        { icon: '💳', title: 'Por Forma de Pagamento',    desc: 'Totais agrupados por dinheiro, crédito, débito e pix — útil para conciliação bancária.' },
        { icon: '📦', title: 'Por Produto',               desc: 'Quantidade vendida e faturamento por produto no período selecionado.' },
        { icon: '👤', title: 'Por Operador',              desc: 'Desempenho de vendas por usuário/operador de caixa.' },
        { icon: '🏪', title: 'Resumo do Caixa',           desc: 'Abertura, fechamento, suprimentos, sangrias e saldo final de cada sessão.' },
        { icon: '📉', title: 'Movimentação de Estoque',   desc: 'Histórico de entradas, saídas e ajustes de cada produto.' },
      ]} />

      <SubTitle>Como usar</SubTitle>
      <div className="space-y-2.5">
        <Step n={1}>Selecione o tipo de relatório desejado.</Step>
        <Step n={2}>Defina o período com os campos de data inicial e final.</Step>
        <Step n={3}>Aplique filtros adicionais (produto, operador, categoria).</Step>
        <Step n={4}>Os dados aparecem na tela em tabela. Use o botão <strong>Exportar</strong> para baixar em PDF ou planilha.</Step>
      </div>
    </section>
  )
}

function SecAuditoria() {
  return (
    <section className="space-y-4">
      <SectionTitle id="auditoria" icon="🔐">Auditoria</SectionTitle>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>
        O Log de Auditoria registra automaticamente todas as ações sensíveis realizadas no sistema — quem fez, o quê e quando. Nada é alterado sem rastreamento.
      </p>

      <SubTitle>O que é registrado</SubTitle>
      <div className="flex flex-wrap gap-2 mt-1">
        {['Login / Logout','Criar produto','Editar produto','Remover produto','Ajuste de estoque','Registrar venda','Cancelar venda','Abrir caixa','Fechar caixa','Criar usuário','Editar usuário'].map(a => (
          <Tag key={a} color="purple">{a}</Tag>
        ))}
      </div>

      <SubTitle>Colunas do log</SubTitle>
      <FeatureGrid items={[
        { icon: '🕐', title: 'Data / Hora',    desc: 'Data e hora exata da ação (horário do servidor).' },
        { icon: '👤', title: 'Usuário',        desc: 'Nome completo e cargo do usuário que realizou a ação.' },
        { icon: '📝', title: 'O que fez',      desc: 'Descrição legível da ação — ex.: "Registrou a Venda #42".' },
        { icon: '🏷️', title: 'Ação',           desc: 'Tipo da ação (criar, editar, deletar, cancelar, ajuste, login, logout).' },
        { icon: '🌐', title: 'IP',             desc: 'Endereço IP do dispositivo utilizado.' },
      ]} />

      <SubTitle>Filtros disponíveis</SubTitle>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>
        Filtre o log por <strong>entidade</strong> (Venda, Produto, Caixa, Estoque, Usuário, Compra) e por <strong>tipo de ação</strong>. Os registros são exibidos do mais recente ao mais antigo.
      </p>

      <InfoBox title="Acesso restrito" color="amber">
        O módulo de Auditoria é visível apenas para <strong>Administradores</strong> e <strong>Gerentes</strong>.
      </InfoBox>
    </section>
  )
}

function SecConfiguracoes() {
  return (
    <section className="space-y-4">
      <SectionTitle id="configuracoes" icon="⚙️">Configurações</SectionTitle>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>
        Gerencie as informações do estabelecimento, usuários do sistema e configurações de impressão.
      </p>

      <FeatureGrid items={[
        { icon: '🏪', title: 'Dados da Empresa',   desc: 'Nome, CNPJ, endereço, telefone e logo que aparecem nos cupons e no sistema.' },
        { icon: '👥', title: 'Usuários',            desc: 'Crie, edite e desative contas de usuários. Defina o perfil de acesso de cada um.' },
        { icon: '🖨️', title: 'Impressora Térmica',  desc: 'Configure o tipo de conexão da impressora de cupom (USB, rede ou arquivo de teste).' },
      ]} />

      <SubTitle>Gerenciar usuários</SubTitle>
      <div className="space-y-2.5">
        <Step n={1}>Acesse <strong>Configurações → Usuários</strong>.</Step>
        <Step n={2}>Clique em <strong>Novo Usuário</strong> para criar uma conta.</Step>
        <Step n={3}>Preencha nome, e-mail, senha e selecione o perfil de acesso.</Step>
        <Step n={4}>Para editar ou desativar, use os botões na linha do usuário.</Step>
      </div>

      <InfoBox title="Acesso restrito" color="amber">
        Apenas <strong>Administradores</strong> têm acesso ao módulo de Configurações.
      </InfoBox>
    </section>
  )
}

function SecPerfis() {
  const perfis = [
    {
      nome: 'Administrador',
      cor: 'red' as const,
      desc: 'Acesso total ao sistema. Gerencia usuários, configurações e todos os módulos operacionais.',
      acesso: ['Frente de Caixa','Caixa','Dashboard','Estoque','Relatórios','Auditoria','Configurações','Usuários'],
    },
    {
      nome: 'Gerente',
      cor: 'purple' as const,
      desc: 'Acesso gerencial. Pode visualizar relatórios, auditoria e estoque, mas não gerencia usuários.',
      acesso: ['Frente de Caixa','Caixa','Dashboard','Estoque','Relatórios','Auditoria'],
    },
    {
      nome: 'Operador de Caixa',
      cor: 'blue' as const,
      desc: 'Focado na operação diária. Realiza vendas e controla o caixa.',
      acesso: ['Frente de Caixa','Caixa'],
    },
    {
      nome: 'Estoquista',
      cor: 'amber' as const,
      desc: 'Gerencia produtos e quantidades em estoque.',
      acesso: ['Estoque'],
    },
  ]

  return (
    <section className="space-y-4">
      <SectionTitle id="perfis" icon="👥">Perfis de Acesso</SectionTitle>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text)' }}>
        Cada usuário tem um perfil que determina quais módulos e ações ele pode executar. O perfil é definido pelo Administrador no cadastro do usuário.
      </p>
      <div className="space-y-3 mt-2">
        {perfis.map(p => (
          <div
            key={p.nome}
            className="rounded-xl p-4"
            style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Tag color={p.cor}>{p.nome}</Tag>
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--clr-text)' }}>{p.desc}</p>
            <div className="flex flex-wrap gap-1.5">
              {p.acesso.map(a => (
                <span
                  key={a}
                  className="text-[11px] px-2 py-0.5 rounded"
                  style={{ background: 'var(--clr-surface)', color: 'var(--clr-text-muted)', border: '1px solid var(--clr-border)' }}
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const SECTION_COMPONENTS: Record<string, () => JSX.Element> = {
  'visao-geral':   SecVisaoGeral,
  'pdv':           SecPDV,
  'caixa':         SecCaixa,
  'estoque':       SecEstoque,
  'dashboard':     SecDashboard,
  'relatorios':    SecRelatorios,
  'auditoria':     SecAuditoria,
  'configuracoes': SecConfiguracoes,
  'perfis':        SecPerfis,
}

export default function DocsPage() {
  const [active, setActive]   = useState('visao-geral')
  const contentRef            = useRef<HTMLDivElement>(null)
  const programmaticRef       = useRef(false)

  const navigateTo = (id: string) => {
    setActive(id)
    programmaticRef.current = true
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => { programmaticRef.current = false }, 900)
  }

  useEffect(() => {
    const container = contentRef.current
    if (!container) return
    const handler = () => {
      if (programmaticRef.current) return
      for (const s of [...SECTIONS].reverse()) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= 120) {
          setActive(s.id)
          break
        }
      }
    }
    container.addEventListener('scroll', handler, { passive: true })
    return () => container.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--clr-bg)' }}>

      {/* Left nav */}
      <aside
        className="hidden md:flex flex-col w-52 shrink-0 py-5 px-3 gap-0.5 overflow-y-auto"
        style={{ borderRight: '1px solid var(--clr-border)', background: 'var(--clr-surface)' }}
      >
        <p className="text-[9px] font-black uppercase tracking-widest px-3 mb-3" style={{ color: 'var(--clr-text-muted)' }}>
          Documentação
        </p>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => navigateTo(s.id)}
            className="text-left text-sm px-3 py-2 rounded-lg font-medium transition-all"
            style={{
              color:      active === s.id ? 'var(--clr-green)'     : 'var(--clr-text-muted)',
              background: active === s.id ? 'var(--clr-green-lite)': 'transparent',
              fontWeight: active === s.id ? 700 : 500,
            }}
          >
            {s.label}
          </button>
        ))}
      </aside>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-8 space-y-14">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--clr-text)' }}>Documentação do Sistema</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--clr-text-muted)' }}>
              Guia completo de uso do Nexshell — módulos, funcionalidades e fluxos de operação.
            </p>
          </div>

          {/* Mobile section nav */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => navigateTo(s.id)}
                className="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all"
                style={{
                  background: active === s.id ? 'var(--clr-green)' : 'var(--clr-surface)',
                  color:      active === s.id ? '#fff'              : 'var(--clr-text-muted)',
                  border:     '1px solid var(--clr-border)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* All sections rendered (scroll-based highlight) */}
          {SECTIONS.map(s => {
            const Comp = SECTION_COMPONENTS[s.id]
            return (
              <div key={s.id}>
                <Comp />
                <div className="mt-14 border-t" style={{ borderColor: 'var(--clr-border)' }} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
