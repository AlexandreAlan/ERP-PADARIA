import { usePDVStore, CartItem } from '@/store/pdvStore'
import { formatBRL } from '@/utils/currency'

export default function CartPanel() {
  const { cart, updateQuantidade, removeItem } = usePDVStore()

  if (cart.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
        <div className="text-6xl mb-4">🛒</div>
        <p className="text-lg">Carrinho vazio</p>
        <p className="text-sm mt-1">Escaneie um produto ou use a busca acima</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-800 text-gray-400 text-xs uppercase">
          <tr>
            <th className="text-left px-3 py-2">Produto</th>
            <th className="text-center px-2 py-2 w-28">Qtd</th>
            <th className="text-right px-3 py-2 w-24">Unit.</th>
            <th className="text-right px-3 py-2 w-24">Total</th>
            <th className="px-2 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {cart.map((item, index) => (
            <CartRow
              key={item.produto_id}
              item={item}
              index={index}
              onUpdateQtd={(q) => updateQuantidade(item.produto_id, q)}
              onRemove={() => removeItem(item.produto_id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CartRow({
  item,
  index,
  onUpdateQtd,
  onRemove,
}: {
  item: CartItem
  index: number
  onUpdateQtd: (q: number) => void
  onRemove: () => void
}) {
  return (
    <tr className={`border-b border-gray-800 ${index % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900'} hover:bg-gray-800 transition-colors`}>
      <td className="px-3 py-2">
        <div className="font-medium text-white truncate max-w-[200px]">{item.nome}</div>
        <div className="text-xs text-gray-500">{item.unidade_medida}</div>
      </td>
      <td className="px-2 py-2 text-center">
        <div className="flex items-center gap-1 justify-center">
          <button
            onClick={() => onUpdateQtd(item.quantidade - 1)}
            className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-white font-bold flex items-center justify-center"
          >
            −
          </button>
          <input
            type="number"
            value={item.quantidade}
            onChange={e => onUpdateQtd(parseFloat(e.target.value) || 0)}
            className="w-12 text-center bg-gray-800 border border-gray-600 rounded text-white text-sm py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
            min="0.001"
            step={item.unidade_medida === 'kg' ? '0.1' : '1'}
          />
          <button
            onClick={() => onUpdateQtd(item.quantidade + 1)}
            className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-white font-bold flex items-center justify-center"
          >
            +
          </button>
        </div>
      </td>
      <td className="px-3 py-2 text-right text-gray-300 font-mono">
        {formatBRL(item.preco_unit)}
      </td>
      <td className="px-3 py-2 text-right text-white font-bold font-mono">
        {formatBRL(item.total_item)}
      </td>
      <td className="px-2 py-2 text-center">
        <button
          onClick={onRemove}
          className="text-gray-500 hover:text-red-400 transition-colors"
          title="Remover item"
        >
          ✕
        </button>
      </td>
    </tr>
  )
}
