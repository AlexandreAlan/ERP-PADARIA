import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { usePDVStore } from '@/store/pdvStore'
import { useAuthStore } from '@/store/authStore'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { formatBRL } from '@/utils/currency'
import CartPanel from './CartPanel'
import PaymentModal from './PaymentModal'
import SessaoGuard from './SessaoGuard'
import { useIsMobile } from '@/Mobile/Android/useIsMobile'

const IconSearch = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
  </svg>
)
const IconCart = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" strokeLinecap="round"/>
  </svg>
)

export default function PDVPage() {
  const isMobile = useIsMobile()
  const [showCartMobile, setShowCartMobile] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaSel, setCategoriaSel] = useState<number | null>(null)
  const store = usePDVStore()
  const queryClient = useQueryClient()

  // Buscar produtos
  const { data: todosProdutos = [] } = useQuery(['produtos-ativos'], () => api.get('/produtos?apenas_ativos=true').then(r => r.data))
  const { data: categorias = [] } = useQuery(['categorias'], () => api.get('/categorias').then(r => r.data))

  const filteredProdutos = useMemo(() => {
    let list = todosProdutos
    if (categoriaSel) list = list.filter((p: any) => p.categoria_id === categoriaSel)
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      list = list.filter((p: any) => p.nome.toLowerCase().includes(s) || p.codigo_barras?.includes(s))
    }
    return list.slice(0, 50)
  }, [todosProdutos, categoriaSel, searchTerm])

  const addProduto = (p: any) => {
    store.addItem({
      produto_id: p.id,
      nome: p.nome,
      preco_unit: parseFloat(p.preco_venda),
      custo_unit: parseFloat(p.preco_custo ?? 0),
      quantidade: 1,
      desconto_unit: 0,
      unidade_medida: p.unidade_medida,
    })
    if (isMobile) toast.success(`${p.nome} no carrinho`, { position: 'bottom-center' })
  }

  const createVendaMutation = useMutation(
    (payload: any) => api.post('/vendas', payload).then(r => r.data),
    {
      onSuccess: () => {
        store.clearCart(); setShowCartMobile(false)
        queryClient.invalidateQueries(['estoque-alertas'])
        toast.success('Venda concluída!')
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.detail || 'Erro na venda')
      }
    }
  )

  const total = store.total()

  return (
    <SessaoGuard>
      <div className="flex h-full w-full bg-gray-50 overflow-hidden relative">
        
        {/* Catálogo */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-3 bg-white border-b border-gray-100 flex flex-col gap-3 shrink-0 lg:p-4">
             {/* Busca Grande */}
             <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><IconSearch /></div>
                <input 
                  type="text" 
                  placeholder="Pesquisar produto..."
                  className="input pl-12 h-14 lg:h-12 bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-green-500 rounded-2xl w-full"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>

             {/* Categorias Pills */}
             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button 
                  onClick={() => setCategoriaSel(null)}
                  className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${!categoriaSel ? 'bg-green-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-500'}`}
                >
                  Tudo
                </button>
                {categorias.map((cat: any) => (
                  <button 
                    key={cat.id}
                    onClick={() => setCategoriaSel(cat.id)}
                    className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${categoriaSel === cat.id ? 'bg-green-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-500'}`}
                  >
                    {cat.nome}
                  </button>
                ))}
             </div>
          </div>

          {/* Grid de Produtos - Cards Grandes no Mobile */}
          <div className="flex-1 overflow-y-auto p-3 lg:p-6">
             <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
                {filteredProdutos.map((p: any) => (
                  <button 
                    key={p.id}
                    onClick={() => addProduto(p)}
                    className="bg-white p-3 rounded-3xl border border-gray-100 shadow-sm active:scale-95 transition-all text-left flex flex-col justify-between min-h-[140px] lg:min-h-[160px]"
                  >
                    <span className="text-sm font-bold text-gray-700 line-clamp-2 leading-tight mb-2">{p.nome}</span>
                    <div>
                      <div className="text-green-700 font-mono font-extrabold text-lg">{formatBRL(p.preco_venda)}</div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold mt-1">{p.unidade_medida}</div>
                    </div>
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Carrinho lateral (Desktop) / Drawer (Mobile) */}
        <div className={`
          ${isMobile ? 'fixed inset-0 z-[200]' : 'w-80 border-l border-gray-200 bg-white flex flex-col'}
          ${isMobile && !showCartMobile ? 'pointer-events-none' : 'pointer-events-auto'}
        `}>
           {isMobile && (
             <div 
               className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${showCartMobile ? 'opacity-100' : 'opacity-0'}`} 
               onClick={() => setShowCartMobile(false)}
             />
           )}
           
           <div className={`
             ${isMobile ? 'absolute bottom-0 left-0 right-0 h-[85vh] rounded-t-[40px] shadow-2xl animate-slide-up' : 'h-full'}
             bg-white flex flex-col overflow-hidden transition-transform duration-300
             ${isMobile && !showCartMobile ? 'translate-y-full' : 'translate-y-0'}
           `}>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                 <h2 className="text-xl font-black text-gray-800">Seu Pedido</h2>
                 {isMobile && (
                   <button onClick={() => setShowCartMobile(false)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth={3} strokeLinecap="round"/></svg>
                   </button>
                 )}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                 <CartPanel />
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-4 shrink-0 safe-area-bottom">
                 <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Total a pagar</span>
                    <span className="text-3xl font-black text-green-700">{formatBRL(total)}</span>
                 </div>
                 <button
                  disabled={store.cart.length === 0}
                  onClick={() => { setShowCartMobile(false); setShowPaymentModal(true) }}
                  className="btn-primary w-full py-5 rounded-2xl text-lg shadow-xl"
                 >
                   Finalizar Compra
                 </button>
              </div>
           </div>
        </div>

        {/* Floating Cart Button */}
        {isMobile && store.cart.length > 0 && !showCartMobile && (
          <button
            onClick={() => setShowCartMobile(true)}
            className="fixed bottom-24 right-6 w-16 h-16 bg-green-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[110] active:scale-90 transition-transform border-4 border-white"
          >
            <IconCart />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center border-2 border-white">
              {store.cart.length}
            </span>
          </button>
        )}
      </div>

      {showPaymentModal && (
        <PaymentModal
          total={total}
          isLoading={createVendaMutation.isLoading}
          onCancel={() => setShowPaymentModal(false)}
          onConfirm={(pagamentos) => {
            if (!store.sessaoId) {
              toast.error('Nenhuma sessão de caixa aberta')
              return
            }
            createVendaMutation.mutate(
              {
                sessao_id: store.sessaoId,
                itens: store.cart.map((item) => ({
                  produto_id: item.produto_id,
                  quantidade: item.quantidade,
                  desconto_unit: item.desconto_unit,
                })),
                pagamentos,
                desconto_valor: store.desconto,
                desconto_pct: store.descontoPct,
                observacao: store.observacao,
              },
              { onSuccess: () => setShowPaymentModal(false) }
            )
          }}
        />
      )}
    </SessaoGuard>
  )
}
