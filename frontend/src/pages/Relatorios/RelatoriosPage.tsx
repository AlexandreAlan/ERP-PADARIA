import { useState } from 'react'
import { format, subDays } from 'date-fns'
import toast from 'react-hot-toast'
import { api } from '@/config/api'

// ── Email modal ───────────────────────────────────────────────────────────────

interface EmailModalProps {
  dataInicio: string
  dataFim: string
  onClose: () => void
}

function EmailModal({ dataInicio, dataFim, onClose }: EmailModalProps) {
  const [destinatario, setDestinatario] = useState('')
  const [assunto, setAssunto]           = useState(
    `Relatório de Vendas — ${dataInicio} a ${dataFim}`
  )
  const [enviando, setEnviando]         = useState(false)

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!destinatario.trim()) return
    setEnviando(true)
    try {
      await api.post('/relatorios/vendas/email', {
        destinatario,
        assunto,
        data_inicio: dataInicio,
        data_fim:    dataFim,
      })
      toast.success(`Relatório enviado para ${destinatario}!`)
      onClose()
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erro ao enviar e-mail'
      toast.error(msg)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="font-semibold text-white">Enviar relatório por e-mail</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              PDF de vendas · {dataInicio} → {dataFim}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleEnviar} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm text-gray-400">Destinatário *</label>
            <input
              type="email"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
              placeholder="email@exemplo.com"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm text-gray-400">Assunto</label>
            <input
              type="text"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Relatório de Vendas"
            />
          </div>

          <div className="bg-gray-800/60 rounded-lg px-3 py-2.5 text-xs text-gray-500">
            O PDF do relatório de vendas será gerado e anexado automaticamente.
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={enviando || !destinatario.trim()}
              className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {enviando ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Enviando...
                </>
              ) : (
                <>✉️ Enviar</>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dataFim,    setDataFim]    = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading,    setLoading]    = useState<string | null>(null)
  const [showEmail,  setShowEmail]  = useState(false)

  const download = async (tipo: 'pdf' | 'excel') => {
    const ext       = tipo === 'pdf' ? 'pdf' : 'xlsx'
    const mediaType = tipo === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    setLoading(tipo)
    try {
      const response = await api.get(
        `/relatorios/vendas/${tipo}?data_inicio=${dataInicio}&data_fim=${dataFim}`,
        { responseType: 'blob' }
      )
      const url     = URL.createObjectURL(new Blob([response.data], { type: mediaType }))
      const link    = document.createElement('a')
      link.href     = url
      link.download = `vendas_${dataInicio}_${dataFim}.${ext}`
      link.click()
      URL.revokeObjectURL(url)
      toast.success(`Relatório ${tipo.toUpperCase()} gerado!`)
    } catch {
      toast.error('Erro ao gerar relatório')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Relatórios</h1>

      <div className="card max-w-xl">
        <h2 className="text-lg font-semibold text-white mb-4">Relatório de Vendas</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="label">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => download('pdf')}
            disabled={!!loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading === 'pdf' ? '⏳' : '📄'} Exportar PDF
          </button>
          <button
            onClick={() => download('excel')}
            disabled={!!loading}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            {loading === 'excel' ? '⏳' : '📊'} Exportar Excel
          </button>
          <button
            onClick={() => setShowEmail(true)}
            disabled={!!loading}
            title="Enviar PDF por e-mail"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-sm font-medium rounded-lg border border-gray-600 transition-colors disabled:opacity-50"
          >
            ✉️
          </button>
        </div>
      </div>

      {showEmail && (
        <EmailModal
          dataInicio={dataInicio}
          dataFim={dataFim}
          onClose={() => setShowEmail(false)}
        />
      )}
    </div>
  )
}
