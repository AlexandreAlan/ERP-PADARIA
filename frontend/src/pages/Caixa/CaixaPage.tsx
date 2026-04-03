import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { formatBRL } from '@/utils/currency'
import { format } from 'date-fns'
import { usePDVStore } from '@/store/pdvStore'

export default function CaixaPage() {
  const [showSangria,   setShowSangria]   = useState(false)
  const [showSuprimento, setShowSuprimento] = useState(false)
  const [showFechar,    setShowFechar]    = useState(false)
  const [valorSangria,  setValorSangria]  = useState('')
  const [motivoSangria, setMotivoSangria] = useState('')
  const [valorFechamento, setValorFechamento] = useState('')
  const { sessaoId, setSessaoId }         = usePDVStore()
  const queryClient                        = useQueryClient()

  const { data: sessao, isLoading } = useQuery(
    'sessao-ativa',
    () => api.get('/caixa/sessao-ativa').then(r => r.data),
    { onSuccess: (d) => { if (d) setSessaoId(d.id) } }
  )

  const sangriaM = useMutation(
    (p: any) => api.post(`/caixa/${sessaoId}/sangria`, p).then(r => r.data),
    {
      onSuccess: () => {
        toast.success('Sangria registrada')
        setShowSangria(false)
        setValorSangria('')
        setMotivoSangria('')
        queryClient.invalidateQueries('sessao-ativa')
      },
      onError: (e: any) => toast.error(e.response?.data?.detail || 'Erro'),
    }
  )

  const fecharM = useMutation(
    (p: any) => api.post(`/caixa/${sessaoId}/fechar`, p).then(r => r.data),
    {
      onSuccess: (data) => {
        setSessaoId(null)
        setShowFechar(false)
        queryClient.invalidateQueries('sessao-ativa')
        toast.success(`Caixa fechado. Diferença: ${formatBRL(data.sessao.diferenca || 0)}`)
      },
      onError: (e: any) => toast.error(e.response?.data?.detail || 'Erro'),
    }
  )

  if (isLoading) return <div className="p-6 text-gray-400">Carregando...</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Controle de Caixa</h1>

      {!sessao ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-gray-400">Nenhuma sessão aberta. Acesse o PDV para abrir o caixa.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status da sessão */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-xs text-gray-400 uppercase">Caixa</p>
              <p className="text-lg font-bold text-white">{sessao.caixa_nome}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 uppercase">Operador</p>
              <p className="text-lg font-bold text-white">{sessao.usuario_nome}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 uppercase">Aberto em</p>
              <p className="text-lg font-bold text-white">{format(new Date(sessao.opened_at), 'HH:mm dd/MM')}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 uppercase">Status</p>
              <p className="text-lg font-bold text-green-400">🟢 Aberto</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-xs text-gray-400 uppercase">Fundo Inicial</p>
              <p className="text-xl font-bold font-mono text-gray-300">{formatBRL(sessao.valor_abertura)}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 uppercase">Total Vendas</p>
              <p className="text-xl font-bold font-mono text-green-400">{formatBRL(sessao.total_vendas)}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 uppercase">Sangrias</p>
              <p className="text-xl font-bold font-mono text-red-400">- {formatBRL(sessao.total_sangrias)}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 uppercase">Saldo Esperado</p>
              <p className="text-xl font-bold font-mono text-brand-400">
                {formatBRL(
                  parseFloat(sessao.valor_abertura) +
                  parseFloat(sessao.total_vendas) -
                  parseFloat(sessao.total_sangrias) +
                  parseFloat(sessao.total_suprimentos)
                )}
              </p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3">
            <button onClick={() => setShowSangria(true)} className="btn-secondary">
              💸 Sangria
            </button>
            <button onClick={() => setShowSuprimento(true)} className="btn-secondary">
              ➕ Suprimento
            </button>
            <button onClick={() => setShowFechar(true)} className="btn-danger">
              🔒 Fechar Caixa
            </button>
          </div>
        </div>
      )}

      {/* Modal Sangria */}
      {showSangria && (
        <Modal title="Registrar Sangria" onClose={() => setShowSangria(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Valor</label>
              <input type="number" step="0.01" value={valorSangria} onChange={e => setValorSangria(e.target.value)} className="input text-xl font-mono text-center" autoFocus />
            </div>
            <div>
              <label className="label">Motivo</label>
              <input type="text" value={motivoSangria} onChange={e => setMotivoSangria(e.target.value)} className="input" placeholder="Ex: Pagamento de fornecedor" />
            </div>
            <button
              onClick={() => sangriaM.mutate({ valor: parseFloat(valorSangria), motivo: motivoSangria })}
              disabled={!valorSangria || !motivoSangria || sangriaM.isLoading}
              className="btn-danger w-full"
            >
              {sangriaM.isLoading ? 'Registrando...' : 'Confirmar Sangria'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Fechar Caixa */}
      {showFechar && (
        <Modal title="Fechar Caixa" onClose={() => setShowFechar(false)}>
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Informe o valor em espécie no caixa físico:</p>
            <input
              type="number" step="0.01"
              value={valorFechamento}
              onChange={e => setValorFechamento(e.target.value)}
              className="input text-xl font-mono text-center"
              placeholder="0.00" autoFocus
            />
            <button
              onClick={() => fecharM.mutate({ valor_fechamento: parseFloat(valorFechamento) || 0 })}
              disabled={fecharM.isLoading}
              className="btn-danger w-full"
            >
              {fecharM.isLoading ? 'Fechando...' : '🔒 Confirmar Fechamento'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
