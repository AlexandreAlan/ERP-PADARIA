/**
 * SessaoGuard — Bloqueia o PDV se não houver sessão de caixa aberta.
 * Exibe um modal para abrir o caixa antes de continuar.
 */

import { useState } from 'react'
import { useQuery, useMutation } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { usePDVStore } from '@/store/pdvStore'
import { formatBRL } from '@/utils/currency'

interface Props {
  children: React.ReactNode
}

export default function SessaoGuard({ children }: Props) {
  const [valorAbertura, setValorAbertura] = useState('0.00')
  const [caixaId, setCaixaId]             = useState<number | null>(null)
  const { sessaoId, setSessaoId }         = usePDVStore()

  const { data: sessaoAtiva, isLoading: checkingSession } = useQuery(
    'sessao-ativa',
    () => api.get('/caixa/sessao-ativa').then(r => r.data),
    {
      onSuccess: (data) => {
        if (data) setSessaoId(data.id)
      },
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
        toast.success(`Caixa aberto! Fundo: ${formatBRL(data.valor_abertura)}`)
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.detail || 'Erro ao abrir caixa')
      },
    }
  )

  if (checkingSession) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">Verificando sessão...</div>
      </div>
    )
  }

  if (!sessaoId && !sessaoAtiva) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md border border-gray-700 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🏪</div>
            <h2 className="text-xl font-bold text-white">Abrir Caixa</h2>
            <p className="text-gray-400 text-sm mt-1">
              Informe o fundo de caixa inicial para começar a vender
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Selecione o Caixa</label>
              <select
                value={caixaId || ''}
                onChange={e => setCaixaId(Number(e.target.value))}
                className="input"
              >
                <option value="">-- Selecione --</option>
                {caixas?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Valor de Abertura (fundo de caixa)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorAbertura}
                onChange={e => setValorAbertura(e.target.value)}
                className="input text-xl font-mono text-center"
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
              className="btn-success w-full text-lg py-3"
            >
              {abrirCaixaMutation.isLoading ? '⏳ Abrindo...' : '🔓 Abrir Caixa'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
