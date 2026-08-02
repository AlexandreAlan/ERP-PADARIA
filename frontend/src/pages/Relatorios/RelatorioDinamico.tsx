import { useState } from 'react'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'

const LABEL_DIMENSAO: Record<string, string> = {
  dia: 'Dia', categoria: 'Categoria', produto: 'Produto',
  operador: 'Operador', caixa: 'Caixa', cliente: 'Cliente',
}
const LABEL_METRICA: Record<string, string> = {
  quantidade: 'Quantidade', faturamento: 'Faturamento', custo: 'Custo',
  lucro: 'Lucro', num_vendas: 'Nº de vendas', ticket_medio: 'Ticket médio',
}

const IconLoading = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function Chip({ ativo, label, onClick }: { ativo: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
      style={ativo
        ? { background: 'var(--clr-primary)', color: 'white', borderColor: 'var(--clr-primary)' }
        : { background: 'var(--clr-surface, white)', color: 'var(--clr-text)', borderColor: 'var(--clr-border)' }
      }
    >
      {label}
    </button>
  )
}

export default function RelatorioDinamico() {
  const [dimensoes, setDimensoes] = useState<string[]>(['produto'])
  const [metricas, setMetricas] = useState<string[]>(['quantidade', 'faturamento'])
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [linhas, setLinhas] = useState<Record<string, any>[] | null>(null)
  const [gerando, setGerando] = useState(false)
  const [exportando, setExportando] = useState(false)

  const { data: opcoes } = useQuery('relatorio-dinamico-opcoes', () =>
    api.get('/relatorios/dinamico/opcoes').then(r => r.data)
  )

  const toggle = (lista: string[], setLista: (v: string[]) => void, valor: string) => {
    setLista(lista.includes(valor) ? lista.filter(v => v !== valor) : [...lista, valor])
  }

  const payload = () => ({
    dimensoes, metricas,
    filtros: { data_inicio: dataInicio || undefined, data_fim: dataFim || undefined },
  })

  const gerar = async () => {
    if (dimensoes.length === 0) return toast.error('Escolha ao menos uma dimensão')
    if (metricas.length === 0) return toast.error('Escolha ao menos uma métrica')
    setGerando(true)
    try {
      const { data } = await api.post('/relatorios/dinamico', payload())
      setLinhas(data.linhas)
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Erro ao gerar o relatório')
    } finally {
      setGerando(false)
    }
  }

  const exportar = async () => {
    setExportando(true)
    try {
      const response = await api.post('/relatorios/dinamico/excel', payload(), { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'relatorio_dinamico.xlsx'
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao exportar')
    } finally {
      setExportando(false)
    }
  }

  const colunas = linhas && linhas.length > 0 ? Object.keys(linhas[0]) : []
  const rotulo = (c: string) => LABEL_DIMENSAO[c] ?? LABEL_METRICA[c] ?? c

  return (
    <div className="space-y-5">
      <div className="bakery-card space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--clr-text-muted)' }}>
            Agrupar por
          </p>
          <div className="flex gap-2 flex-wrap">
            {(opcoes?.dimensoes ?? []).map((d: string) => (
              <Chip key={d} ativo={dimensoes.includes(d)} label={LABEL_DIMENSAO[d] ?? d}
                    onClick={() => toggle(dimensoes, setDimensoes, d)} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--clr-text-muted)' }}>
            Somar
          </p>
          <div className="flex gap-2 flex-wrap">
            {(opcoes?.metricas ?? []).map((m: string) => (
              <Chip key={m} ativo={metricas.includes(m)} label={LABEL_METRICA[m] ?? m}
                    onClick={() => toggle(metricas, setMetricas, m)} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="label">Data início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Data fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input" />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={gerar} disabled={gerando} className="btn-action gap-2">
            {gerando ? <IconLoading /> : null}
            {gerando ? 'Gerando...' : 'Gerar relatório'}
          </button>
          {linhas && linhas.length > 0 && (
            <button onClick={exportar} disabled={exportando} className="btn-bakery gap-2">
              {exportando ? <IconLoading /> : null}
              {exportando ? 'Exportando...' : 'Exportar Excel'}
            </button>
          )}
        </div>
      </div>

      {linhas && (
        linhas.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--clr-text-muted)' }}>
            Nenhuma venda encontrada com esses filtros.
          </p>
        ) : (
          <div className="bakery-card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--clr-bg)' }}>
                  {colunas.map(c => (
                    <th key={c} className="text-left px-4 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>
                      {rotulo(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--clr-border)' }}>
                    {colunas.map(c => (
                      <td key={c} className="px-4 py-2" style={{ color: 'var(--clr-text)' }}>{String(linha[c])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
