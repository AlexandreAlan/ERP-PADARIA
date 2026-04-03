/**
 * PaymentModal — Gerencia pagamento com suporte a split (múltiplas formas).
 *
 * Formas:
 *  - Dinheiro  → mostra campo "valor recebido" e calcula troco
 *  - Crédito   → aceita NSU (opcional)
 *  - Débito    → aceita NSU (opcional)
 *  - PIX       → (estrutura preparada para QR Code dinâmico)
 *
 * Split: o operador pode adicionar múltiplos pagamentos até cobrir o total.
 */

import { useState, useMemo } from 'react'
import { formatBRL } from '@/utils/currency'

interface Payment {
  forma: string
  valor: number
  nsu?: string
}

interface PaymentModalProps {
  total: number
  onConfirm: (pagamentos: Payment[]) => void
  onCancel: () => void
  isLoading: boolean
}

const FORMAS = [
  { key: 'dinheiro',        label: 'Dinheiro',       icon: '💵' },
  { key: 'cartao_credito',  label: 'Crédito',         icon: '💳' },
  { key: 'cartao_debito',   label: 'Débito',          icon: '💳' },
  { key: 'pix',             label: 'PIX',             icon: '📱' },
]

export default function PaymentModal({ total, onConfirm, onCancel, isLoading }: PaymentModalProps) {
  const [pagamentos, setPagamentos] = useState<Payment[]>([])
  const [formaAtual, setFormaAtual] = useState<string>('dinheiro')
  const [valorAtual, setValorAtual] = useState<string>('')
  const [nsuAtual,   setNsuAtual]   = useState<string>('')

  const totalPago = useMemo(() => pagamentos.reduce((a, p) => a + p.valor, 0), [pagamentos])
  const restante  = useMemo(() => Math.max(0, total - totalPago), [total, totalPago])
  const troco     = useMemo(() => {
    const pago = parseFloat(valorAtual) || 0
    const tmp  = totalPago + pago
    return formaAtual === 'dinheiro' && tmp > total ? tmp - total : 0
  }, [valorAtual, totalPago, total, formaAtual])

  const addPagamento = () => {
    const valor = parseFloat(valorAtual)
    if (!valor || valor <= 0) return
    setPagamentos(prev => [...prev, { forma: formaAtual, valor, nsu: nsuAtual || undefined }])
    setValorAtual('')
    setNsuAtual('')
  }

  const removePagamento = (index: number) => {
    setPagamentos(prev => prev.filter((_, i) => i !== index))
  }

  const handleConfirm = () => {
    // Se só tem dinheiro e não digitou valor, assume exato
    if (pagamentos.length === 0 && formaAtual === 'dinheiro') {
      const valor = parseFloat(valorAtual) || total
      onConfirm([{ forma: 'dinheiro', valor }])
      return
    }
    if (pagamentos.length === 0) return
    onConfirm(pagamentos)
  }

  const podeConcluir = pagamentos.length > 0
    ? totalPago >= total
    : (parseFloat(valorAtual) || 0) >= total || formaAtual === 'dinheiro'

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="p-5 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Pagamento</h2>
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-400">Total da venda:</span>
            <span className="text-2xl font-bold text-brand-400 font-mono">{formatBRL(total)}</span>
          </div>
          {totalPago > 0 && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-gray-400">Restante:</span>
              <span className="text-lg font-bold text-yellow-400 font-mono">{formatBRL(restante)}</span>
            </div>
          )}
        </div>

        {/* Pagamentos já adicionados */}
        {pagamentos.length > 0 && (
          <div className="px-5 pt-3 space-y-1">
            {pagamentos.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-700 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-300">
                  {FORMAS.find(f => f.key === p.forma)?.icon} {FORMAS.find(f => f.key === p.forma)?.label}
                  {p.nsu && <span className="text-gray-500 ml-2 text-xs">NSU: {p.nsu}</span>}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{formatBRL(p.valor)}</span>
                  <button onClick={() => removePagamento(i)} className="text-gray-500 hover:text-red-400">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Adicionar pagamento */}
        {restante > 0 || pagamentos.length === 0 ? (
          <div className="p-5 space-y-4">
            {/* Botões de forma */}
            <div className="grid grid-cols-4 gap-2">
              {FORMAS.map(f => (
                <button
                  key={f.key}
                  onClick={() => {
                    setFormaAtual(f.key)
                    setValorAtual(restante > 0 ? restante.toFixed(2) : '')
                  }}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1 border-2 transition-all ${
                    formaAtual === f.key
                      ? 'border-brand-500 bg-brand-900/30 text-white'
                      : 'border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <span className="text-2xl">{f.icon}</span>
                  <span className="text-xs font-medium">{f.label}</span>
                </button>
              ))}
            </div>

            {/* Valor */}
            <div>
              <label className="label">Valor</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={valorAtual}
                onChange={e => setValorAtual(e.target.value)}
                onFocus={e => e.target.select()}
                placeholder={formatBRL(restante > 0 ? restante : total)}
                className="input text-xl font-mono font-bold text-center"
                autoFocus
              />
            </div>

            {/* NSU para cartão */}
            {(formaAtual === 'cartao_credito' || formaAtual === 'cartao_debito') && (
              <div>
                <label className="label">NSU (opcional)</label>
                <input
                  type="text"
                  value={nsuAtual}
                  onChange={e => setNsuAtual(e.target.value)}
                  placeholder="Número da transação"
                  className="input"
                />
              </div>
            )}

            {/* Troco */}
            {troco > 0 && (
              <div className="bg-green-900/30 border border-green-700 rounded-xl p-3 text-center">
                <span className="text-green-400 font-bold text-lg">
                  Troco: {formatBRL(troco)}
                </span>
              </div>
            )}

            {/* Adicionar forma de pagamento ao split */}
            {pagamentos.length > 0 && (
              <button onClick={addPagamento} className="btn-secondary w-full">
                + Adicionar forma de pagamento
              </button>
            )}
          </div>
        ) : (
          <div className="p-5">
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-3 text-center">
              <span className="text-green-400 font-bold">✓ Pagamento completo</span>
              {totalPago > total && (
                <div className="text-green-300 text-sm mt-1">
                  Troco: {formatBRL(totalPago - total)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botões */}
        <div className="p-5 border-t border-gray-700 flex gap-3">
          <button onClick={onCancel} disabled={isLoading} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !podeConcluir}
            className="btn-success flex-1 text-lg py-3"
          >
            {isLoading ? '⏳ Processando...' : '✓ Confirmar Venda'}
          </button>
        </div>
      </div>
    </div>
  )
}
