import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { formatBRL } from '@/utils/currency'

interface ContaBancaria {
  id: number
  banco: string
  agencia?: string | null
  conta: string
  tipo: string
  ativo: boolean
}

interface Lancamento {
  id: number
  conta_bancaria_id: number
  data: string
  descricao: string
  valor: number
  tipo: 'credito' | 'debito'
  conciliado: boolean
  conciliado_tipo?: string | null
  conciliado_ref_id?: number | null
}

interface Sugestao {
  pagamento_id: number
  venda_id: number
  forma: string
  valor: number
  data: string
}

function NovaContaForm({ onCriada }: { onCriada: () => void }) {
  const [banco, setBanco] = useState('')
  const [agencia, setAgencia] = useState('')
  const [conta, setConta] = useState('')
  const [tipo, setTipo] = useState('corrente')
  const qc = useQueryClient()

  const { mutate, isLoading } = useMutation(
    () => api.post('/financeiro/contas-bancarias', { banco, agencia: agencia || undefined, conta, tipo }),
    {
      onSuccess: () => {
        toast.success('Conta bancária cadastrada')
        qc.invalidateQueries('contas-bancarias')
        setBanco(''); setAgencia(''); setConta('')
        onCriada()
      },
      onError: (err: any) => { toast.error(err.response?.data?.detail ?? 'Erro ao cadastrar conta') },
    }
  )

  return (
    <div className="bakery-card space-y-3 max-w-lg">
      <h3 className="font-semibold text-sm" style={{ color: 'var(--clr-text)' }}>Nova conta bancária</h3>
      <div className="grid grid-cols-2 gap-3">
        <input className="input" placeholder="Banco (ex: Itaú)" value={banco} onChange={e => setBanco(e.target.value)} />
        <input className="input" placeholder="Agência" value={agencia} onChange={e => setAgencia(e.target.value)} />
        <input className="input" placeholder="Conta" value={conta} onChange={e => setConta(e.target.value)} />
        <select className="input" value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="corrente">Corrente</option>
          <option value="poupanca">Poupança</option>
        </select>
      </div>
      <button
        className="btn-action"
        disabled={isLoading || !banco.trim() || !conta.trim()}
        onClick={() => mutate()}
      >
        {isLoading ? 'Salvando...' : 'Cadastrar conta'}
      </button>
    </div>
  )
}

function SugestoesLancamento({ lancamentoId, onConciliado }: { lancamentoId: number; onConciliado: () => void }) {
  const { data: sugestoes = [], isLoading } = useQuery<Sugestao[]>(
    ['sugestoes', lancamentoId],
    () => api.get(`/financeiro/lancamentos/${lancamentoId}/sugestoes`).then(r => r.data)
  )

  const { mutate: conciliar } = useMutation(
    (pagamentoId: number) => api.post(`/financeiro/lancamentos/${lancamentoId}/conciliar`, {
      tipo: 'pagamento', ref_id: pagamentoId,
    }),
    {
      onSuccess: () => { toast.success('Conciliado!'); onConciliado() },
      onError: (err: any) => { toast.error(err.response?.data?.detail ?? 'Erro ao conciliar') },
    }
  )

  const { mutate: marcarManual } = useMutation(
    () => api.post(`/financeiro/lancamentos/${lancamentoId}/conciliar`, { tipo: 'ajuste_manual' }),
    {
      onSuccess: () => { toast.success('Marcado como conciliado (ajuste manual)'); onConciliado() },
      onError: (err: any) => { toast.error(err.response?.data?.detail ?? 'Erro ao conciliar') },
    }
  )

  if (isLoading) return <p className="text-xs px-4 py-2" style={{ color: 'var(--clr-text-muted)' }}>Buscando sugestões...</p>

  return (
    <div className="px-4 py-3 space-y-2" style={{ background: 'var(--clr-bg)' }}>
      {sugestoes.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>
          Nenhum PIX/dinheiro com esse valor em ±2 dias. Se souber que é de uma venda em cartão
          (o depósito costuma juntar várias vendas), marque como conciliado manualmente.
        </p>
      ) : (
        sugestoes.map(s => (
          <div key={s.pagamento_id} className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--clr-text)' }}>
              Venda #{s.venda_id} — {s.forma} — {formatBRL(s.valor)} — {s.data}
            </span>
            <button className="text-xs font-semibold px-2 py-1 rounded-lg text-white" style={{ background: '#16a34a' }}
                    onClick={() => conciliar(s.pagamento_id)}>
              Conciliar
            </button>
          </div>
        ))
      )}
      <button
        className="text-xs font-semibold px-2 py-1 rounded-lg border"
        style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text-muted)' }}
        onClick={() => marcarManual()}
      >
        Marcar como conciliado (ajuste manual)
      </button>
    </div>
  )
}

export default function ConciliacaoBancaria() {
  const [contaSelecionada, setContaSelecionada] = useState<number | null>(null)
  const [filtro, setFiltro] = useState<'todos' | 'pendentes' | 'conciliados'>('pendentes')
  const [expandido, setExpandido] = useState<number | null>(null)
  const [mostrarNovaConta, setMostrarNovaConta] = useState(false)
  const qc = useQueryClient()

  const { data: contas = [] } = useQuery<ContaBancaria[]>('contas-bancarias', () =>
    api.get('/financeiro/contas-bancarias').then(r => r.data)
  )

  const conciliadoParam = filtro === 'todos' ? undefined : filtro === 'conciliados'
  const { data: lancamentos = [], refetch } = useQuery<Lancamento[]>(
    ['lancamentos', contaSelecionada, filtro],
    () => api.get('/financeiro/lancamentos', {
      params: { conta_bancaria_id: contaSelecionada ?? undefined, conciliado: conciliadoParam },
    }).then(r => r.data),
    { enabled: !!contaSelecionada }
  )

  const { mutate: importarOfx, isLoading: importando } = useMutation(
    (arquivo: File) => {
      const form = new FormData()
      form.append('arquivo', arquivo)
      return api.post(`/financeiro/contas-bancarias/${contaSelecionada}/importar-ofx`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    {
      onSuccess: ({ data }) => {
        toast.success(`${data.importados} lançamento(s) importado(s), ${data.duplicados} já existiam.`)
        qc.invalidateQueries(['lancamentos'])
      },
      onError: (err: any) => { toast.error(err.response?.data?.detail ?? 'Erro ao importar o extrato') },
    }
  )

  const handleArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) importarOfx(f)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="input w-64"
          value={contaSelecionada ?? ''}
          onChange={e => setContaSelecionada(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Selecione a conta bancária...</option>
          {contas.map(c => (
            <option key={c.id} value={c.id}>{c.banco} — {c.conta}</option>
          ))}
        </select>
        <button className="btn-bakery" onClick={() => setMostrarNovaConta(v => !v)}>
          {mostrarNovaConta ? 'Cancelar' : '+ Nova conta'}
        </button>
        {contaSelecionada && (
          <label className="btn-action cursor-pointer">
            {importando ? 'Importando...' : 'Importar extrato OFX'}
            <input type="file" accept=".ofx,.txt" className="hidden" onChange={handleArquivo} disabled={importando} />
          </label>
        )}
      </div>

      {mostrarNovaConta && <NovaContaForm onCriada={() => setMostrarNovaConta(false)} />}

      {contaSelecionada && (
        <>
          <div className="flex gap-2">
            {(['pendentes', 'conciliados', 'todos'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={filtro === f
                  ? { background: 'var(--clr-primary)', color: 'white' }
                  : { background: 'var(--clr-bg)', color: 'var(--clr-text-muted)', border: '1px solid var(--clr-border)' }
                }
              >
                {f === 'pendentes' ? 'Pendentes' : f === 'conciliados' ? 'Conciliados' : 'Todos'}
              </button>
            ))}
          </div>

          {lancamentos.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: 'var(--clr-text-muted)' }}>
              Nenhum lançamento. Importe um extrato OFX pra começar.
            </p>
          ) : (
            <div className="space-y-2">
              {lancamentos.map(lc => (
                <div key={lc.id}>
                  <button
                    onClick={() => setExpandido(expandido === lc.id ? null : lc.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left"
                    style={{ border: '1px solid var(--clr-border)', background: 'var(--clr-surface, white)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>{lc.data}</span>
                      <span className="text-sm" style={{ color: 'var(--clr-text)' }}>{lc.descricao || '(sem descrição)'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold" style={{ color: lc.tipo === 'credito' ? '#16a34a' : '#dc2626' }}>
                        {lc.tipo === 'credito' ? '+' : '−'} {formatBRL(lc.valor)}
                      </span>
                      {lc.conciliado ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#16a34a' }}>
                          Conciliado
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fef3c7', color: '#b45309' }}>
                          Pendente
                        </span>
                      )}
                    </div>
                  </button>
                  {expandido === lc.id && !lc.conciliado && lc.tipo === 'credito' && (
                    <SugestoesLancamento lancamentoId={lc.id} onConciliado={() => { refetch(); setExpandido(null) }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
