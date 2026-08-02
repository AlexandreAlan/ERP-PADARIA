import { useState } from 'react'
import ConciliacaoBancaria from './ConciliacaoBancaria'
import ContratosCartao from './ContratosCartao'

export default function FinanceiroPage() {
  const [aba, setAba] = useState<'conciliacao' | 'cartao'>('conciliacao')

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--clr-bg)', minHeight: '100vh' }}>
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--clr-text)' }}>Financeiro</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>
          Conciliação bancária e contratos de taxa das maquininhas de cartão
        </p>
      </div>

      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--clr-border)' }}>
        {[
          { id: 'conciliacao' as const, label: 'Conciliação Bancária' },
          { id: 'cartao' as const, label: 'Contratos de Cartão' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className="px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors"
            style={aba === t.id
              ? { borderColor: 'var(--clr-primary)', color: 'var(--clr-primary)' }
              : { borderColor: 'transparent', color: 'var(--clr-text-muted)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {aba === 'conciliacao' ? <ConciliacaoBancaria /> : <ContratosCartao />}
    </div>
  )
}
