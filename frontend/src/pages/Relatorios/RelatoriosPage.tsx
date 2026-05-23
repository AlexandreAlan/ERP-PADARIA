import { useState } from 'react'
import { format, subDays } from 'date-fns'
import toast from 'react-hot-toast'
import { api } from '@/config/api'

const IconPDF = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
)
const IconExcel = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
)
const IconEmail = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
)
const IconLoading = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

function EmailModal({ dataInicio, dataFim, onClose }: { dataInicio: string; dataFim: string; onClose: () => void }) {
  const [destinatario, setDestinatario] = useState('')
  const [assunto, setAssunto]           = useState(`Relatório de Vendas — ${dataInicio} a ${dataFim}`)
  const [enviando, setEnviando]         = useState(false)

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!destinatario.trim()) return
    setEnviando(true)
    try {
      await api.post('/relatorios/vendas/email', { destinatario, assunto, data_inicio: dataInicio, data_fim: dataFim })
      toast.success(`Relatório enviado para ${destinatario}!`)
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar e-mail')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(25,40,25,0.55)', backdropFilter: 'blur(3px)' }}>
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-xl" style={{ border: '1px solid var(--clr-border)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--clr-border)' }}>
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--clr-text)' }}>Enviar por e-mail</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>{dataInicio} → {dataFim}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--clr-text-muted)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-bg)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleEnviar} className="p-6 space-y-4">
          <div>
            <label className="label">Destinatário *</label>
            <input type="email" className="input" value={destinatario} onChange={e => setDestinatario(e.target.value)} placeholder="email@exemplo.com" required autoFocus />
          </div>
          <div>
            <label className="label">Assunto</label>
            <input type="text" className="input" value={assunto} onChange={e => setAssunto(e.target.value)} placeholder="Relatório de Vendas" />
          </div>
          <p className="text-xs px-3 py-2.5 rounded-lg" style={{ background: 'var(--clr-green-pale)', color: 'var(--clr-text-muted)' }}>
            O PDF do relatório será gerado e anexado automaticamente.
          </p>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={enviando || !destinatario.trim()} className="btn-action flex-1">
              {enviando ? <><IconLoading /> Enviando...</> : <><IconEmail /> Enviar</>}
            </button>
            <button type="button" onClick={onClose} className="btn-bakery flex-1">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

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
      const url  = URL.createObjectURL(new Blob([response.data], { type: mediaType }))
      const link = document.createElement('a')
      link.href     = url
      link.download = `vendas_${dataInicio}_${dataFim}.${ext}`
      link.click()
      URL.revokeObjectURL(url)
      toast.success(`Relatório ${tipo.toUpperCase()} gerado!`)
    } catch {
      toast.error('Erro ao gerar relatório. Verifique as datas e tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--clr-bg)', minHeight: '100vh' }}>

      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--clr-text)' }}>Relatórios</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>Exporte seus dados de vendas em PDF ou planilha</p>
      </div>

      <div className="max-w-lg bakery-card space-y-5">
        <div>
          <h2 className="font-semibold text-base mb-4" style={{ color: 'var(--clr-text)' }}>Relatório de Vendas</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data Início</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Data Fim</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => download('pdf')}
            disabled={!!loading}
            className="btn-action flex-1 gap-2"
          >
            {loading === 'pdf' ? <IconLoading /> : <IconPDF />}
            Exportar PDF
          </button>
          <button
            onClick={() => download('excel')}
            disabled={!!loading}
            className="btn-bakery flex-1 gap-2"
          >
            {loading === 'excel' ? <IconLoading /> : <IconExcel />}
            Exportar Excel
          </button>
          <button
            onClick={() => setShowEmail(true)}
            disabled={!!loading}
            className="btn-bakery px-4 gap-2"
            title="Enviar por e-mail"
          >
            <IconEmail />
          </button>
        </div>

        <p className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>
          Os arquivos gerados incluem todas as vendas do período selecionado.
        </p>
      </div>

      {showEmail && (
        <EmailModal dataInicio={dataInicio} dataFim={dataFim} onClose={() => setShowEmail(false)} />
      )}
    </div>
  )
}
