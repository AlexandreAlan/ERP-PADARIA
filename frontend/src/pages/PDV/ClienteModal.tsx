import { useState } from 'react'
import { useQuery } from 'react-query'
import { api } from '@/config/api'

interface Cliente { id: number; nome: string; telefone?: string }

export default function ClienteModal({ onSelect, onClose }: {
  onSelect: (id: number | null, nome: string | null) => void
  onClose: () => void
}) {
  const [busca, setBusca] = useState('')
  const { data: clientes = [], isLoading } = useQuery(
    ['clientes-pdv', busca],
    () => api.get('/clientes', { params: busca ? { q: busca } : {} }).then(r => r.data),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="font-bold text-sm" style={{ color: '#f5f5f5' }}>Selecionar cliente</h2>
          <button onClick={onClose} style={{ color: '#9ca3af' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="p-4">
          <input
            autoFocus
            type="text"
            placeholder="Buscar por nome, CPF ou telefone..."
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: '#222224', border: '1px solid rgba(255,255,255,0.08)', color: '#f5f5f5' }}
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        <div className="max-h-72 overflow-y-auto px-2 pb-2">
          <button
            onClick={() => { onSelect(null, null); onClose() }}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors"
            style={{ color: '#9ca3af' }}
          >
            Venda sem cliente identificado
          </button>
          {isLoading && <p className="px-3 py-2 text-xs" style={{ color: '#9ca3af' }}>Buscando...</p>}
          {clientes.map((c: Cliente) => (
            <button
              key={c.id}
              onClick={() => { onSelect(c.id, c.nome); onClose() }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between"
              style={{ color: '#f5f5f5' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#222224'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <span>{c.nome}</span>
              {c.telefone && <span className="text-xs" style={{ color: '#9ca3af' }}>{c.telefone}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
