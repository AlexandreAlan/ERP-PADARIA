import { useState, useMemo, useEffect } from 'react'
import { formatBRL } from '@/utils/currency'

interface Payment { forma: string; valor: number; nsu?: string }

interface Props {
  total: number
  onConfirm: (pagamentos: Payment[]) => void
  onCancel: () => void
  isLoading: boolean
}

const IconDinheiro = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
  </svg>
)
const IconCartao = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
)
const IconPix = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
  </svg>
)

const FORMAS = [
  { key: 'dinheiro',       label: 'Dinheiro', icon: <IconDinheiro />, cor: '#22c55e' },
  { key: 'cartao_credito', label: 'Crédito',  icon: <IconCartao />,  cor: '#3b82f6' },
  { key: 'cartao_debito',  label: 'Débito',   icon: <IconCartao />,  cor: '#8b5cf6' },
  { key: 'pix',            label: 'PIX',      icon: <IconPix />,     cor: '#06b6d4' },
]

const MAQUINETAS = ['1', '2', '3', '4']

const isCard = (forma: string) => forma === 'cartao_credito' || forma === 'cartao_debito'

function labelPagamento(pg: Payment): string {
  const info = FORMAS.find(f => f.key === pg.forma)
  const base = info?.label ?? pg.forma
  return pg.nsu ? `${base} — Maq. ${pg.nsu}` : base
}

export default function PaymentModal({ total, onConfirm, onCancel, isLoading }: Props) {
  const [pagamentos, setPagamentos] = useState<Payment[]>([])
  const [formaAtual, setFormaAtual] = useState('dinheiro')
  const [valorAtual, setValorAtual] = useState('')
  const [maquineta,  setMaquineta]  = useState<string | null>(null)

  const totalPago = useMemo(() => pagamentos.reduce((a, p) => a + p.valor, 0), [pagamentos])
  const restante  = useMemo(() => parseFloat(Math.max(0, total - totalPago).toFixed(2)), [total, totalPago])

  const valorNumerico = useMemo(() => parseFloat(valorAtual) || 0, [valorAtual])
  const troco = useMemo(() => {
    if (formaAtual !== 'dinheiro') return 0
    const tmp = totalPago + valorNumerico
    return tmp > total ? parseFloat((tmp - total).toFixed(2)) : 0
  }, [valorAtual, totalPago, total, formaAtual])

  useEffect(() => {
    if (restante > 0) setValorAtual(restante.toFixed(2))
    else setValorAtual('')
    setMaquineta(null)
  }, [formaAtual])

  const maquinetaOk = !isCard(formaAtual) || !!maquineta

  const addPagamento = () => {
    const valor = parseFloat(valorAtual)
    if (!valor || valor <= 0 || !maquinetaOk) return
    setPagamentos(prev => [...prev, { forma: formaAtual, valor, nsu: maquineta ?? undefined }])
    setValorAtual('')
    setMaquineta(null)
  }

  const removePagamento = (i: number) => setPagamentos(prev => prev.filter((_, idx) => idx !== i))

  const handleConfirm = () => {
    if (!podeConcluir) return
    if (pagamentos.length === 0) {
      let valor: number
      if (formaAtual === 'dinheiro') {
        valor = valorNumerico > 0 ? Math.max(valorNumerico, total) : total
      } else {
        valor = valorNumerico > 0 ? valorNumerico : total
      }
      onConfirm([{ forma: formaAtual, valor, nsu: maquineta ?? undefined }])
    } else {
      onConfirm(pagamentos)
    }
  }

  const podeConcluir = (pagamentos.length > 0
    ? totalPago >= total
    : formaAtual === 'dinheiro'
      ? true
      : valorNumerico >= total
  ) && maquinetaOk

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: '#1a1a1c', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-6 py-5" style={{ background: '#141416', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#6b7280' }}>Total a pagar</p>
          <div className="font-mono font-bold text-4xl" style={{ color: '#22c55e', letterSpacing: '-0.02em' }}>{formatBRL(total)}</div>
          {totalPago > 0 && totalPago < total && (
            <div className="mt-2 text-sm font-semibold" style={{ color: '#f59e0b' }}>Restante: {formatBRL(restante)}</div>
          )}
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-4 gap-2">
            {FORMAS.map(f => {
              const sel = formaAtual === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setFormaAtual(f.key)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                  style={{
                    border: `2px solid ${sel ? f.cor : 'rgba(255,255,255,0.08)'}`,
                    background: sel ? `${f.cor}1a` : '#222224',
                    color: sel ? f.cor : '#8b8b8f',
                  }}
                >
                  {f.icon}
                  <span className="text-[10px] font-bold uppercase tracking-wide leading-none">{f.label}</span>
                </button>
              )
            })}
          </div>

          {isCard(formaAtual) && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: '#9ca3af' }}>Selecione a maquineta</p>
              <div className="grid grid-cols-4 gap-2">
                {MAQUINETAS.map(n => {
                  const sel = maquineta === n
                  const cor = FORMAS.find(f => f.key === formaAtual)!.cor
                  return (
                    <button
                      key={n}
                      onClick={() => setMaquineta(n)}
                      className="h-11 rounded-xl font-bold text-base transition-all"
                      style={{
                        border: `2px solid ${sel ? cor : 'rgba(255,255,255,0.08)'}`,
                        background: sel ? `${cor}1a` : '#222224',
                        color: sel ? cor : '#8b8b8f',
                      }}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
              {!maquineta && <p className="text-[11px] mt-1.5" style={{ color: '#ef4444' }}>Selecione a maquineta para continuar</p>}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold" style={{ color: '#9ca3af' }}>Valor recebido (R$)</label>
            <input
              type="number"
              value={valorAtual}
              onChange={e => setValorAtual(e.target.value)}
              className="w-full mt-1 px-3 py-3 rounded-xl text-center font-mono font-bold text-2xl outline-none"
              style={{ background: '#222224', border: '1px solid rgba(255,255,255,0.08)', color: '#f5f5f5' }}
              placeholder={restante > 0 ? restante.toFixed(2) : total.toFixed(2)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
              step="0.01"
              min="0"
            />
          </div>

          {troco > 0 && (
            <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
              <span className="text-sm font-semibold" style={{ color: '#22c55e' }}>Troco a devolver</span>
              <span className="font-mono font-bold text-lg" style={{ color: '#22c55e' }}>{formatBRL(troco)}</span>
            </div>
          )}

          {pagamentos.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9ca3af' }}>Pagamentos adicionados</p>
              {pagamentos.map((pg, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm" style={{ background: '#222224', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: '#d1d5db' }}>{labelPagamento(pg)}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold" style={{ color: '#f5f5f5' }}>{formatBRL(pg.valor)}</span>
                    <button onClick={() => removePagamento(i)} style={{ color: '#ef4444' }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {restante > 0 && pagamentos.length > 0 && (
            <button
              onClick={addPagamento}
              disabled={!maquinetaOk}
              className="w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db', background: '#222224' }}
            >
              + Adicionar pagamento parcial
            </button>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#141416' }}>
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db' }}
          >
            Voltar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!podeConcluir || isLoading}
            className="flex-[2] py-3 rounded-xl text-base font-bold transition-colors disabled:opacity-40"
            style={{ background: '#22c55e', color: '#0a0a0a' }}
          >
            {isLoading ? 'Processando...' : 'Confirmar Venda'}
          </button>
        </div>
      </div>
    </div>
  )
}
