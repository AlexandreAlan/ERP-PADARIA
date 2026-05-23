import { useState } from 'react'
import { useQuery, useMutation } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { usePDVStore } from '@/store/pdvStore'
import { formatBRL } from '@/utils/currency'

interface Props { children: React.ReactNode }

export default function SessaoGuard({ children }: Props) {
  const [valorAbertura, setValorAbertura] = useState('0.00')
  const [caixaId, setCaixaId]             = useState<number | null>(null)
  const { sessaoId, setSessaoId }         = usePDVStore()

  const { data: sessaoAtiva, isLoading: checkingSession } = useQuery(
    'sessao-ativa',
    () => api.get('/caixa/sessao-ativa').then(r => r.data),
    {
      onSuccess: (data) => { if (data) setSessaoId(data.id) },
      retry: false,
    }
  )

  const { data: caixas } = useQuery(
    'caixas',
    () => api.get('/caixa/caixas').then(r => r.data),
    { enabled: !sessaoAtiva && !checkingSession }
  )

  const abrirCaixaMutation = useMutation(
    (payload: any) => api.post('/caixa/abrir', payload).then(r => r.data),
    {
      onSuccess: (data) => {
        setSessaoId(data.id)
        toast.success(`Caixa aberto com fundo de ${formatBRL(data.valor_abertura)}`)
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.detail || 'Erro ao abrir caixa')
      },
    }
  )

  if (checkingSession) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--clr-bg)' }}>
        <div className="flex items-center gap-3" style={{ color: 'var(--clr-text-muted)' }}>
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--clr-border-2)', borderTopColor: 'var(--clr-green)' }} />
          <span className="text-sm">Verificando sessão...</span>
        </div>
      </div>
    )
  }

  if (!sessaoId && !sessaoAtiva) {
    return (
      <div className="flex-1 flex items-center justify-center p-4" style={{ background: 'var(--clr-bg)' }}>
        <div
          className="w-full max-w-sm rounded-2xl p-8 space-y-6"
          style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', boxShadow: '0 4px 24px rgba(45,106,79,0.08)' }}
        >
          <div className="text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--clr-green-pale)' }}
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--clr-green)' }}>
                <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--clr-text)' }}>Abrir Caixa</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--clr-text-muted)' }}>
              Informe o fundo de caixa para começar a vender
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Caixa</label>
              <select
                value={caixaId || ''}
                onChange={e => setCaixaId(Number(e.target.value))}
                className="input"
              >
                <option value="">Selecione o caixa...</option>
                {caixas?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Fundo de caixa (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorAbertura}
                onChange={e => setValorAbertura(e.target.value)}
                className="input h-14 text-2xl font-mono text-center"
                placeholder="0.00"
                autoFocus
              />
            </div>

            <button
              onClick={() => {
                if (!caixaId) return toast.error('Selecione um caixa')
                abrirCaixaMutation.mutate({
                  caixa_id: caixaId,
                  valor_abertura: parseFloat(valorAbertura) || 0,
                })
              }}
              disabled={abrirCaixaMutation.isLoading || !caixaId}
              className="btn-action w-full py-3 text-base"
            >
              {abrirCaixaMutation.isLoading ? 'Abrindo...' : 'Abrir Caixa'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
