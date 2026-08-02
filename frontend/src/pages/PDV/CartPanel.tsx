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
      <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} style={{ color: 'var(--clr-border-2)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--clr-text-med)' }}>Nenhum item na venda</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>Bipe o código de barras ou selecione um produto</p>
        </div>
      </div>
    )
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr style={{ borderBottom: '1px solid var(--clr-border)' }}>
          <th className="text-left py-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--clr-text-muted)' }}>Produto</th>
          <th className="text-center py-1.5 text-[11px] font-bold uppercase tracking-wide w-20" style={{ color: 'var(--clr-text-muted)' }}>Qtd</th>
          <th className="text-right py-1.5 text-[11px] font-bold uppercase tracking-wide w-20" style={{ color: 'var(--clr-text-muted)' }}>Vl. unit.</th>
          <th className="text-right py-1.5 text-[11px] font-bold uppercase tracking-wide w-24" style={{ color: 'var(--clr-text-muted)' }}>Total</th>
        </tr>
      </thead>
      <tbody>
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
      </tbody>
    </table>
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
    <tr
      onClick={onSelecionar}
      className="cursor-pointer transition-colors"
      style={{
        borderBottom: '1px solid var(--clr-border)',
        background: selecionado ? 'var(--clr-green-lite)' : 'transparent',
      }}
    >
      <td className="py-2 pr-2">
        <p className="font-semibold leading-tight" style={{ color: 'var(--clr-text)' }}>{item.nome}</p>
        <p className="text-[11px]" style={{ color: 'var(--clr-text-muted)' }}>{item.unidade_medida}</p>
      </td>
      <td className="py-2 text-center" onClick={e => e.stopPropagation()}>
        <input
          type="number"
          value={item.quantidade}
          onChange={e => onUpdateQtd(parseFloat(e.target.value) || 0)}
          className="w-14 text-center font-mono font-semibold text-sm outline-none rounded"
          style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', color: 'var(--clr-text)' }}
        />
      </td>
      <td className="py-2 text-right font-mono" style={{ color: 'var(--clr-text-muted)' }}>
        {formatBRL(item.preco_unit)}
      </td>
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="font-mono font-bold" style={{ color: 'var(--clr-text)' }}>{formatBRL(item.total_item)}</span>
          <button
            onClick={e => { e.stopPropagation(); onRemove() }}
            title="Remover item (Del)"
            style={{ color: 'var(--clr-border-2)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--clr-danger)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--clr-border-2)'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  )
}
