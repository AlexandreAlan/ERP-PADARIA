/**
 * PDVPage — Frente de Caixa completa.
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────┐
 * │  TOPBAR: sessão + operador + alertas                     │
 * ├──────────────────────────────┬──────────────────────────┤
 * │  CARRINHO (esq.)             │  TOTAL + PAGAMENTO (dir.)│
 * │  - Lista de itens            │  - Subtotal / Desconto   │
 * │  - Busca/scanner             │  - Total                  │
 * │                              │  - Botões de pagamento   │
 * └──────────────────────────────┴──────────────────────────┘
 */

import { useState, useCallback } from 'react'
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

export default function PDVPage() {
  const [showPayment, setShowPayment] = useState(false)
  const [lastVenda, setLastVenda]     = useState<any>(null)
  const [searchTerm, setSearchTerm]   = useState('')

  const { user }     = useAuthStore()
  const store        = usePDVStore()
  const queryClient  = useQueryClient()

  // Busca por código de barras ao escanear
  const handleBarcodeScan = useCallback(async (code: string) => {
    try {
      const { data: produto } = await api.get(`/produtos/barcode/${code}`)
      store.addItem({
        produto_id:   produto.id,
        nome:         produto.nome,
        preco_unit:   parseFloat(produto.preco_venda),
        custo_unit:   parseFloat(produto.preco_custo),
        quantidade:   1,
        desconto_unit: 0,
        unidade_medida: produto.unidade_medida,
      })
      toast.success(`${produto.nome} adicionado`, { duration: 1500, icon: '✓' })
    } catch (err: any) {
      if (err.response?.status === 404) {
        toast.error(`Código '${code}' não encontrado`)
      } else {
        toast.error('Erro ao buscar produto')
      }
    }
  }, [store])

  useBarcodeScanner({ onScan: handleBarcodeScan, enabled: !showPayment })

  // Busca por nome/código manual
  const { data: searchResults } = useQuery(
    ['produtos-search', searchTerm],
    () => api.get(`/produtos?q=${searchTerm}&apenas_ativos=true`).then(r => r.data),
    { enabled: searchTerm.length >= 2, staleTime: 10_000 }
  )

  // Mutation de venda
  const createVendaMutation = useMutation(
    (payload: any) => api.post('/vendas', payload).then(r => r.data),
    {
      onSuccess: (venda) => {
        setLastVenda(venda)
        store.clearCart()
        setShowPayment(false)
        queryClient.invalidateQueries(['estoque-alertas'])
        toast.success(`Venda #${venda.id} concluída! Total: ${formatBRL(venda.total)}`, { duration: 4000 })
      },
      onError: (err: any) => {
        const msg = err.response?.data?.detail || 'Erro ao processar venda'
        toast.error(msg)
      },
    }
  )

  const subtotal = store.subtotal()
  const total    = store.total()
  const hasItems = store.cart.length > 0

  return (
    <SessaoGuard>
      <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-brand-400 font-bold text-lg">PDV</span>
            <span className="text-gray-400 text-sm">Operador: {user?.nome}</span>
          </div>
          {lastVenda && (
            <button
              onClick={() => api.get(`/vendas/${lastVenda.id}/recibo`, { responseType: 'blob' }).then(() => toast.success('Reimprimindo...'))}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              ↩ Reimprimir último cupom #{lastVenda.id}
            </button>
          )}
        </div>

        {/* Main area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Coluna esquerda: Carrinho */}
          <div className="flex flex-col flex-1 overflow-hidden border-r border-gray-700">
            {/* Barra de busca */}
            <div className="p-3 border-b border-gray-700 bg-gray-900">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar produto por nome ou código... (ou use o leitor)"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="input pr-10 text-base"
                  autoComplete="off"
                />
                <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
              </div>

              {/* Dropdown de resultados da busca manual */}
              {searchResults && searchTerm.length >= 2 && (
                <div className="absolute z-50 mt-1 w-full max-w-lg bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-gray-400 text-sm">Nenhum produto encontrado</div>
                  ) : (
                    searchResults.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          store.addItem({
                            produto_id: p.id,
                            nome: p.nome,
                            preco_unit: parseFloat(p.preco_venda),
                            custo_unit: 0,
                            quantidade: 1,
                            desconto_unit: 0,
                            unidade_medida: p.unidade_medida,
                          })
                          setSearchTerm('')
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-700 flex justify-between items-center"
                      >
                        <div>
                          <div className="text-sm font-medium text-white">{p.nome}</div>
                          <div className="text-xs text-gray-400">{p.codigo_barras || 'S/Código'}</div>
                        </div>
                        <div className="text-brand-400 font-bold">{formatBRL(p.preco_venda)}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Lista do carrinho */}
            <CartPanel />
          </div>

          {/* Coluna direita: Total + Pagamento */}
          <div className="w-80 flex flex-col bg-gray-900 shrink-0">
            {/* Totais */}
            <div className="p-4 flex-1 space-y-3">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span className="font-mono">{formatBRL(subtotal)}</span>
              </div>

              {store.desconto > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Desconto</span>
                  <span className="font-mono">- {formatBRL(store.desconto)}</span>
                </div>
              )}

              <div className="border-t border-gray-700 pt-3">
                <div className="flex justify-between text-white">
                  <span className="text-lg font-bold">TOTAL</span>
                  <span className="text-2xl font-bold font-mono text-brand-400">{formatBRL(total)}</span>
                </div>
              </div>

              <div className="text-center text-gray-500 text-sm">
                {store.cart.length} item(s) no carrinho
              </div>
            </div>

            {/* Ações */}
            <div className="p-4 space-y-2 border-t border-gray-700">
              <button
                onClick={() => setShowPayment(true)}
                disabled={!hasItems}
                className="btn-success w-full text-lg py-4 text-center"
              >
                💳 PAGAR
              </button>
              <button
                onClick={() => { if (confirm('Limpar carrinho?')) store.clearCart() }}
                disabled={!hasItems}
                className="btn-danger w-full"
              >
                🗑 Limpar Carrinho
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de pagamento */}
      {showPayment && (
        <PaymentModal
          total={total}
          onConfirm={(pagamentos) => {
            if (!store.sessaoId) return toast.error('Nenhuma sessão de caixa aberta')
            createVendaMutation.mutate({
              sessao_id:     store.sessaoId,
              itens:         store.cart.map(c => ({
                produto_id:    c.produto_id,
                quantidade:    c.quantidade,
                desconto_unit: c.desconto_unit,
              })),
              pagamentos,
              desconto_valor: store.desconto,
              desconto_pct:   store.descontoPct,
              observacao:     store.observacao,
            })
          }}
          onCancel={() => setShowPayment(false)}
          isLoading={createVendaMutation.isLoading}
        />
      )}
    </SessaoGuard>
  )
}
