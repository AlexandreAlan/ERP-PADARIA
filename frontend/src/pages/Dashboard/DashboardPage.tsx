import { useState } from 'react'
import { useQuery } from 'react-query'
import { format, subDays } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { api } from '@/config/api'
import { formatBRL } from '@/utils/currency'

const PERIODOS = [
  { label: 'Hoje',       days: 0 },
  { label: '7 dias',     days: 7 },
  { label: '30 dias',    days: 30 },
  { label: '90 dias',    days: 90 },
]

export default function DashboardPage() {
  const [periodo, setPeriodo] = useState(7)

  const dataFim   = format(new Date(), 'yyyy-MM-dd')
  const dataInicio = format(subDays(new Date(), periodo), 'yyyy-MM-dd')

  const { data, isLoading } = useQuery(
    ['dashboard', dataInicio, dataFim],
    () => api.get(`/dashboard?data_inicio=${dataInicio}&data_fim=${dataFim}`).then(r => r.data),
    { refetchInterval: 60_000 }
  )

  if (isLoading) return <div className="p-6 text-gray-400">Carregando dashboard...</div>

  const kpis      = data?.kpis
  const vendasDia = data?.vendas_por_dia || []
  const alertas   = data?.alertas_estoque || []
  const abc       = data?.curva_abc || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex gap-2">
          {PERIODOS.map(p => (
            <button
              key={p.days}
              onClick={() => setPeriodo(p.days)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                periodo === p.days
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Faturamento Bruto"    value={formatBRL(kpis.faturamento_bruto)}    icon="💰" color="text-green-400" />
          <KPICard label="Faturamento Líquido"  value={formatBRL(kpis.faturamento_liquido)}  icon="📈" color="text-blue-400" />
          <KPICard label="Lucro Bruto"          value={formatBRL(kpis.lucro_bruto)}          icon="📊" color="text-brand-400" />
          <KPICard label="Margem Média"         value={`${kpis.margem_media}%`}              icon="%" color="text-purple-400" />
          <KPICard label="Qtd. Vendas"          value={kpis.quantidade_vendas.toString()}     icon="🛒" color="text-yellow-400" />
          <KPICard label="Ticket Médio"         value={formatBRL(kpis.ticket_medio)}         icon="🎫" color="text-cyan-400" />
          <KPICard label="Custo Total"          value={formatBRL(kpis.custo_total)}          icon="⬇" color="text-red-400" />
          <KPICard label="Itens Vendidos"       value={kpis.itens_vendidos.toString()}        icon="📦" color="text-gray-300" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de vendas */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4">Faturamento por Dia</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={vendasDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="data" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                formatter={(v: any) => [formatBRL(v), 'Total']}
                labelFormatter={l => `Data: ${l}`}
              />
              <Bar dataKey="total_vendas" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alertas de estoque */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">
            ⚠ Estoque Baixo
            {alertas.length > 0 && (
              <span className="ml-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                {alertas.length}
              </span>
            )}
          </h2>
          {alertas.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-4">✓ Estoque OK</div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {alertas.map((a: any) => (
                <div key={a.produto_id} className={`flex justify-between items-center px-3 py-2 rounded-lg ${a.urgente ? 'bg-red-900/30 border border-red-700' : 'bg-yellow-900/20 border border-yellow-700'}`}>
                  <div>
                    <div className="text-sm font-medium text-white truncate max-w-[140px]">{a.produto_nome}</div>
                    <div className="text-xs text-gray-400">Mín: {a.estoque_minimo} {a.unidade_medida}</div>
                  </div>
                  <div className={`font-bold font-mono text-sm ${a.urgente ? 'text-red-400' : 'text-yellow-400'}`}>
                    {a.estoque_atual} {a.unidade_medida}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Curva ABC */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Curva ABC de Produtos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
                <th className="text-left py-2 px-3">Produto</th>
                <th className="text-right py-2 px-3">Qtd Vendida</th>
                <th className="text-right py-2 px-3">Faturamento</th>
                <th className="text-right py-2 px-3">% do Total</th>
                <th className="text-right py-2 px-3">% Acum.</th>
                <th className="text-center py-2 px-3">Classe</th>
              </tr>
            </thead>
            <tbody>
              {abc.slice(0, 20).map((item: any, i: number) => (
                <tr key={item.produto_id} className={`border-b border-gray-800 ${i % 2 === 0 ? '' : 'bg-gray-900/30'}`}>
                  <td className="py-2 px-3 text-gray-200">{item.produto_nome}</td>
                  <td className="py-2 px-3 text-right text-gray-300 font-mono">{item.quantidade_vendida}</td>
                  <td className="py-2 px-3 text-right text-white font-mono font-medium">{formatBRL(item.faturamento)}</td>
                  <td className="py-2 px-3 text-right text-gray-300 font-mono">{item.faturamento_pct}%</td>
                  <td className="py-2 px-3 text-right text-gray-300 font-mono">{item.faturamento_acumulado_pct}%</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`badge-${item.classificacao.toLowerCase()}`}>{item.classificacao}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider">{label}</p>
          <p className={`text-xl font-bold font-mono mt-1 ${color}`}>{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
