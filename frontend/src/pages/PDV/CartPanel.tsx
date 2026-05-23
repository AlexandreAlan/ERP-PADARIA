import { usePDVStore, CartItem } from '@/store/pdvStore'
import { formatBRL } from '@/utils/currency'

export default function CartPanel() {
  const { cart, updateQuantidade, removeItem } = usePDVStore()

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} style={{ color: 'var(--clr-border-2)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--clr-text-med)' }}>Pedido vazio</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>Clique em um produto ou escaneie</p>
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
          onUpdateQtd={q => updateQuantidade(item.produto_id, q)}
          onRemove={() => removeItem(item.produto_id)}
        />
      ))}
    </div>
  )
}

function CartRow({ item, onUpdateQtd, onRemove }: {
  item: CartItem
  onUpdateQtd: (q: number) => void
  onRemove: () => void
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ border: '1px solid var(--clr-border)', background: 'var(--clr-green-pale)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--clr-text)' }}>
            {item.nome}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>
            {formatBRL(item.preco_unit)} / {item.unidade_medida}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="transition-colors p-0.5 shrink-0"
          style={{ color: 'var(--clr-border-2)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--clr-danger)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--clr-border-2)'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--clr-border)', background: '#fff' }}
        >
          <button
            onClick={() => onUpdateQtd(item.quantidade - 1)}
            className="w-7 h-7 flex items-center justify-center font-bold text-base leading-none transition-colors"
            style={{ color: 'var(--clr-text-med)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-green-lite)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            −
          </button>
          <input
            type="number"
            value={item.quantidade}
            onChange={e => onUpdateQtd(parseFloat(e.target.value) || 0)}
            className="w-10 bg-transparent text-center font-mono font-semibold text-sm outline-none"
            style={{ color: 'var(--clr-text)' }}
          />
          <button
            onClick={() => onUpdateQtd(item.quantidade + 1)}
            className="w-7 h-7 flex items-center justify-center font-bold text-base leading-none transition-colors"
            style={{ color: 'var(--clr-text-med)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-green-lite)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            +
          </button>
        </div>

        <span className="font-mono font-bold text-sm" style={{ color: 'var(--clr-green)' }}>
          {formatBRL(item.total_item)}
        </span>
      </div>
    </div>
  )
}
