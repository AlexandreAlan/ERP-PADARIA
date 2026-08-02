import { usePDVStore, CartItem } from '@/store/pdvStore'
import { formatBRL } from '@/utils/currency'

interface Props {
  selecionado: number | null
  onSelecionar: (produtoId: number | null) => void
}

export default function CartPanel({ selecionado, onSelecionar }: Props) {
  const { cart, updateQuantidade, removeItem } = usePDVStore()

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} style={{ color: '#4b4b4d' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
        <div>
          <p className="font-semibold text-sm" style={{ color: '#d1d5db' }}>Nenhum item na venda</p>
          <p className="text-xs mt-0.5" style={{ color: '#8b8b8f' }}>Bipe o código de barras ou selecione um produto</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {cart.map(item => (
        <CartRow
          key={item.produto_id}
          item={item}
          selecionado={selecionado === item.produto_id}
          onSelecionar={() => onSelecionar(item.produto_id)}
          onUpdateQtd={q => updateQuantidade(item.produto_id, q)}
          onRemove={() => removeItem(item.produto_id)}
        />
      ))}
    </div>
  )
}

function Miniatura({ nome }: { nome: string }) {
  const inicial = nome.charAt(0).toUpperCase()
  return (
    <div
      className="w-11 h-11 rounded-lg shrink-0 flex items-center justify-center font-bold text-sm"
      style={{ background: '#2a2a2d', color: '#6b7280' }}
    >
      {inicial}
    </div>
  )
}

function CartRow({ item, selecionado, onSelecionar, onUpdateQtd, onRemove }: {
  item: CartItem
  selecionado: boolean
  onSelecionar: () => void
  onUpdateQtd: (q: number) => void
  onRemove: () => void
}) {
  return (
    <div
      onClick={onSelecionar}
      className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors"
      style={{ background: selecionado ? '#232326' : '#1a1a1c', border: `1px solid ${selecionado ? '#22c55e' : 'rgba(255,255,255,0.06)'}` }}
    >
      <Miniatura nome={item.nome} />

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm leading-tight truncate" style={{ color: '#f5f5f5' }}>{item.nome}</p>
        <p className="text-xs mt-0.5" style={{ color: '#22c55e' }}>{formatBRL(item.preco_unit)} <span style={{ color: '#8b8b8f' }}>/ {item.unidade_medida}</span></p>
      </div>

      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onUpdateQtd(item.quantidade - 1)}
          className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm"
          style={{ background: '#2a2a2d', color: '#d1d5db' }}
        >
          −
        </button>
        <input
          type="number"
          value={item.quantidade}
          onChange={e => onUpdateQtd(parseFloat(e.target.value) || 0)}
          className="w-9 text-center bg-transparent font-mono font-semibold text-sm outline-none"
          style={{ color: '#f5f5f5' }}
        />
        <button
          onClick={() => onUpdateQtd(item.quantidade + 1)}
          className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm"
          style={{ background: '#22c55e', color: '#0a0a0a' }}
        >
          +
        </button>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0 w-20">
        <span className="font-mono font-bold text-sm" style={{ color: '#f5f5f5' }}>{formatBRL(item.total_item)}</span>
        <button onClick={onRemove} title="Remover (Del)" style={{ color: '#6b6b6e' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
