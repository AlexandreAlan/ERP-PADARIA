import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { formatBRL } from '@/utils/currency'
import { format } from 'date-fns'
import { usePDVStore } from '@/store/pdvStore'

const IconClose = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18L18 6M6 6l12 12"/>
  </svg>
)
const IconSangria = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
)
const IconSuprimento = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
)
const IconFechar = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
  </svg>
)

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: 'green' | 'red' | 'blue' | 'default' }) {
  const colors = {
    green:   { bg: 'var(--clr-green-pale)', color: 'var(--clr-green)',  border: 'var(--clr-border-2)' },
    red:     { bg: 'var(--clr-danger-bg)',  color: 'var(--clr-danger)', border: '#FCA5A5' },
    blue:    { bg: '#EFF6FF',               color: '#1D4ED8',           border: '#BFDBFE' },
    default: { bg: 'var(--clr-surface)',    color: 'var(--clr-text)',   border: 'var(--clr-border)' },
  }
  const c = colors[accent ?? 'default']
  return (
    <div
      className="rounded-xl p-4 space-y-1"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--clr-text-muted)' }}>{label}</p>
      <p className="font-mono font-bold text-xl" style={{ color: c.color }}>{value}</p>
    </div>
  )
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(25,40,25,0.55)', backdropFilter: 'blur(3px)' }}>
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ border: '1px solid var(--clr-border)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--clr-border)', background: 'var(--clr-green-pale)' }}>
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--clr-text)' }}>{title}</h2>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--clr-text-muted)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-border)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <IconClose />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function CaixaPage() {
  const [showSangria,    setShowSangria]    = useState(false)
  const [showSuprimento, setShowSuprimento] = useState(false)
  const [showFechar,     setShowFechar]     = useState(false)
  const [valorSangria,   setValorSangria]   = useState('')
  const [motivoSangria,  setMotivoSangria]  = useState('')
  const [valorSup,       setValorSup]       = useState('')
  const [motivoSup,      setMotivoSup]      = useState('')
  const [valorFechamento, setValorFechamento] = useState('')
  const { sessaoId, setSessaoId }           = usePDVStore()
  const queryClient                          = useQueryClient()

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
      onError: (e: any) => { toast.error(e.response?.data?.detail || 'Erro') },
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
      onError: (e: any) => { toast.error(e.response?.data?.detail || 'Erro') },
    }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12" style={{ color: 'var(--clr-text-muted)' }}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--clr-border-2)', borderTopColor: 'var(--clr-green)' }} />
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    )
  }

  const saldoEsperado = sessao
    ? parseFloat(sessao.valor_abertura) + parseFloat(sessao.total_vendas) - parseFloat(sessao.total_sangrias) + parseFloat(sessao.total_suprimentos)
    : 0

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--clr-bg)', minHeight: '100vh' }}>

      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--clr-text)' }}>Controle de Caixa</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>Gerencie a sessão de caixa em andamento</p>
      </div>

      {!sessao ? (
        <div
          className="max-w-sm rounded-2xl p-10 flex flex-col items-center gap-4 text-center"
          style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--clr-green-pale)' }}
          >
            <IconFechar />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--clr-text)' }}>Nenhuma sessão aberta</p>
            <p className="text-sm mt-1" style={{ color: 'var(--clr-text-muted)' }}>Acesse o PDV para abrir o caixa.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5 max-w-3xl">

          {/* Cabeçalho da sessão */}
          <div
            className="rounded-2xl p-5 flex items-center justify-between"
            style={{ background: 'var(--clr-sidebar)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(180,220,180,0.5)' }}>Sessão ativa</p>
              <p className="font-bold text-lg text-white">{sessao.caixa_nome}</p>
              <p className="text-sm" style={{ color: 'rgba(180,220,180,0.6)' }}>
                {sessao.usuario_nome} — desde {format(new Date(sessao.opened_at), 'HH:mm, dd/MM/yyyy')}
              </p>
            </div>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(82,183,136,0.2)', color: 'var(--clr-accent)', border: '1px solid rgba(82,183,136,0.3)' }}
            >
              <span className="w-2 h-2 rounded-full bg-current" style={{ animation: 'pulse 2s infinite' }} />
              Aberto
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Fundo inicial"   value={formatBRL(sessao.valor_abertura)} />
            <KpiCard label="Total vendas"    value={formatBRL(sessao.total_vendas)}    accent="green" />
            <KpiCard label="Sangrias"        value={`− ${formatBRL(sessao.total_sangrias)}`} accent="red" />
            <KpiCard label="Saldo esperado"  value={formatBRL(saldoEsperado)}          accent="blue" />
          </div>

          {/* Ações */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowSangria(true)}
              className="btn-bakery gap-2"
            >
              <IconSangria />
              Sangria
            </button>
            <button
              onClick={() => setShowSuprimento(true)}
              className="btn-bakery gap-2"
            >
              <IconSuprimento />
              Suprimento
            </button>
            <button
              onClick={() => setShowFechar(true)}
              className="btn-danger gap-2"
            >
              <IconFechar />
              Fechar Caixa
            </button>
          </div>
        </div>
      )}

      {/* Modal Sangria */}
      {showSangria && (
        <Modal title="Registrar Sangria" subtitle="Retirada de numerário do caixa" onClose={() => setShowSangria(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Valor (R$)</label>
              <input
                type="number" step="0.01" min="0.01"
                value={valorSangria}
                onChange={e => setValorSangria(e.target.value)}
                className="input text-xl font-mono text-center h-14"
                placeholder="0.00" autoFocus
              />
            </div>
            <div>
              <label className="label">Motivo</label>
              <input
                type="text"
                value={motivoSangria}
                onChange={e => setMotivoSangria(e.target.value)}
                className="input"
                placeholder="Ex: Pagamento de fornecedor"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowSangria(false)} className="btn-bakery flex-1">Cancelar</button>
              <button
                onClick={() => sangriaM.mutate({ valor: parseFloat(valorSangria), motivo: motivoSangria })}
                disabled={!valorSangria || !motivoSangria || sangriaM.isLoading}
                className="btn-danger flex-1"
              >
                {sangriaM.isLoading ? 'Registrando...' : 'Confirmar Sangria'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Suprimento */}
      {showSuprimento && (
        <Modal title="Registrar Suprimento" subtitle="Adição de numerário ao caixa" onClose={() => { setShowSuprimento(false); setValorSup(''); setMotivoSup('') }}>
          <div className="space-y-4">
            <div>
              <label className="label">Valor (R$)</label>
              <input
                type="number" step="0.01" min="0.01"
                value={valorSup}
                onChange={e => setValorSup(e.target.value)}
                className="input text-xl font-mono text-center h-14"
                placeholder="0.00" autoFocus
              />
            </div>
            <div>
              <label className="label">Motivo</label>
              <input
                type="text"
                value={motivoSup}
                onChange={e => setMotivoSup(e.target.value)}
                className="input"
                placeholder="Ex: Troco para o turno"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowSuprimento(false); setValorSup(''); setMotivoSup('') }} className="btn-bakery flex-1">Cancelar</button>
              <button
                onClick={() => {
                  const v = parseFloat(valorSup)
                  if (!v || !motivoSup) return
                  api.post(`/caixa/${sessaoId}/suprimento`, { valor: v, motivo: motivoSup })
                    .then(() => {
                      toast.success('Suprimento registrado')
                      setShowSuprimento(false)
                      setValorSup(''); setMotivoSup('')
                      queryClient.invalidateQueries('sessao-ativa')
                    })
                    .catch((e: any) => toast.error(e.response?.data?.detail || 'Erro'))
                }}
                disabled={!valorSup || !motivoSup}
                className="btn-action flex-1"
              >
                Confirmar Suprimento
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Fechar Caixa */}
      {showFechar && (
        <Modal title="Fechar Caixa" subtitle="Informe o valor físico em caixa" onClose={() => setShowFechar(false)}>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--clr-text-muted)' }}>
              Saldo esperado: <strong style={{ color: 'var(--clr-text)' }}>{formatBRL(saldoEsperado)}</strong>
            </p>
            <div>
              <label className="label">Valor em espécie no caixa (R$)</label>
              <input
                type="number" step="0.01"
                value={valorFechamento}
                onChange={e => setValorFechamento(e.target.value)}
                className="input text-xl font-mono text-center h-14"
                placeholder="0.00" autoFocus
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowFechar(false)} className="btn-bakery flex-1">Cancelar</button>
              <button
                onClick={() => fecharM.mutate({ valor_fechamento: parseFloat(valorFechamento) || 0 })}
                disabled={fecharM.isLoading}
                className="btn-danger flex-1"
              >
                {fecharM.isLoading ? 'Fechando...' : 'Confirmar Fechamento'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
