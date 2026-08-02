import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { formatBRL } from '@/utils/currency'

interface Operadora { id: number; nome: string; ativo: boolean }
interface Taxa {
  id: number
  operadora_id: number
  bandeira: string
  tipo: string
  parcelas: number
  taxa_percentual: number
  dias_recebimento: number
}

const BANDEIRAS = ['visa', 'master', 'elo', 'amex', 'hipercard', 'outra']
const TIPOS = [
  { id: 'debito', label: 'Débito' },
  { id: 'credito_vista', label: 'Crédito à vista' },
  { id: 'credito_parcelado', label: 'Crédito parcelado' },
]

function NovaOperadoraForm({ onCriada }: { onCriada: () => void }) {
  const [nome, setNome] = useState('')
  const qc = useQueryClient()
  const { mutate, isLoading } = useMutation(
    () => api.post('/financeiro/operadoras', { nome }),
    {
      onSuccess: () => { toast.success('Operadora cadastrada'); qc.invalidateQueries('operadoras'); setNome(''); onCriada() },
      onError: (err: any) => { toast.error(err.response?.data?.detail ?? 'Erro ao cadastrar') },
    }
  )
  return (
    <div className="flex gap-2">
      <input className="input" placeholder="Nome da operadora (ex: Stone, Cielo...)" value={nome} onChange={e => setNome(e.target.value)} />
      <button className="btn-action whitespace-nowrap" disabled={isLoading || !nome.trim()} onClick={() => mutate()}>
        {isLoading ? 'Salvando...' : 'Cadastrar'}
      </button>
    </div>
  )
}

function NovaTaxaForm({ operadoraId, onCriada }: { operadoraId: number; onCriada: () => void }) {
  const [bandeira, setBandeira] = useState('visa')
  const [tipo, setTipo] = useState('debito')
  const [parcelas, setParcelas] = useState('1')
  const [taxa, setTaxa] = useState('')
  const [dias, setDias] = useState('1')
  const qc = useQueryClient()

  const { mutate, isLoading } = useMutation(
    () => api.post(`/financeiro/operadoras/${operadoraId}/taxas`, {
      bandeira, tipo, parcelas: Number(parcelas),
      taxa_percentual: parseFloat(taxa.replace(',', '.')),
      dias_recebimento: Number(dias),
    }),
    {
      onSuccess: () => {
        toast.success('Taxa cadastrada')
        qc.invalidateQueries(['taxas', operadoraId])
        setTaxa('')
        onCriada()
      },
      onError: (err: any) => { toast.error(err.response?.data?.detail ?? 'Erro ao cadastrar taxa') },
    }
  )

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
      <div>
        <label className="label">Bandeira</label>
        <select className="input" value={bandeira} onChange={e => setBandeira(e.target.value)}>
          {BANDEIRAS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Tipo</label>
        <select className="input" value={tipo} onChange={e => setTipo(e.target.value)}>
          {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Parcelas</label>
        <input type="number" min={1} className="input" value={parcelas} onChange={e => setParcelas(e.target.value)} />
      </div>
      <div>
        <label className="label">Taxa (%)</label>
        <input className="input" placeholder="ex: 3,50" value={taxa} onChange={e => setTaxa(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="label">Prazo (dias)</label>
          <input type="number" min={0} className="input" value={dias} onChange={e => setDias(e.target.value)} />
        </div>
        <button className="btn-action whitespace-nowrap" disabled={isLoading || !taxa} onClick={() => mutate()}>
          +
        </button>
      </div>
    </div>
  )
}

export default function ContratosCartao() {
  const [operadoraSelecionada, setOperadoraSelecionada] = useState<number | null>(null)
  const [mostrarNovaOperadora, setMostrarNovaOperadora] = useState(false)
  const qc = useQueryClient()

  const { data: operadoras = [] } = useQuery<Operadora[]>('operadoras', () =>
    api.get('/financeiro/operadoras').then(r => r.data)
  )

  const { data: taxas = [] } = useQuery<Taxa[]>(
    ['taxas', operadoraSelecionada],
    () => api.get(`/financeiro/operadoras/${operadoraSelecionada}/taxas`).then(r => r.data),
    { enabled: !!operadoraSelecionada }
  )

  const { mutate: excluirTaxa } = useMutation(
    (taxaId: number) => api.delete(`/financeiro/taxas/${taxaId}`),
    {
      onSuccess: () => { toast.success('Taxa removida'); qc.invalidateQueries(['taxas', operadoraSelecionada]) },
      onError: (err: any) => { toast.error(err.response?.data?.detail ?? 'Erro ao remover') },
    }
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="input w-64"
          value={operadoraSelecionada ?? ''}
          onChange={e => setOperadoraSelecionada(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Selecione a operadora (maquininha)...</option>
          {operadoras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <button className="btn-bakery" onClick={() => setMostrarNovaOperadora(v => !v)}>
          {mostrarNovaOperadora ? 'Cancelar' : '+ Nova operadora'}
        </button>
      </div>

      {mostrarNovaOperadora && (
        <div className="bakery-card max-w-lg">
          <NovaOperadoraForm onCriada={() => setMostrarNovaOperadora(false)} />
        </div>
      )}

      {operadoraSelecionada && (
        <div className="bakery-card space-y-4">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--clr-text)' }}>Taxas cadastradas</h3>

          {taxas.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--clr-text-muted)' }}>Nenhuma taxa cadastrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--clr-bg)' }}>
                    {['Bandeira', 'Tipo', 'Parcelas', 'Taxa', 'Prazo', 'Líquido de R$ 100'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>{h}</th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {taxas.map(t => (
                    <tr key={t.id} style={{ borderTop: '1px solid var(--clr-border)' }}>
                      <td className="px-3 py-2 capitalize" style={{ color: 'var(--clr-text)' }}>{t.bandeira}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--clr-text)' }}>{TIPOS.find(x => x.id === t.tipo)?.label ?? t.tipo}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--clr-text)' }}>{t.parcelas}x</td>
                      <td className="px-3 py-2" style={{ color: 'var(--clr-text)' }}>{Number(t.taxa_percentual).toFixed(2)}%</td>
                      <td className="px-3 py-2" style={{ color: 'var(--clr-text)' }}>{t.dias_recebimento}d</td>
                      <td className="px-3 py-2 font-semibold" style={{ color: 'var(--clr-text)' }}>
                        {formatBRL(100 * (1 - Number(t.taxa_percentual) / 100))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button className="text-xs text-red-600 font-semibold" onClick={() => excluirTaxa(t.id)}>Remover</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--clr-border)', paddingTop: '1rem' }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--clr-text-muted)' }}>Nova taxa</p>
            <NovaTaxaForm operadoraId={operadoraSelecionada} onCriada={() => {}} />
          </div>
        </div>
      )}
    </div>
  )
}
