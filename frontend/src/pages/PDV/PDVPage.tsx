import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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

const IconBarcode = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.75 4.5v15m4.5-15v15m3-15v15m3-15v15m4.5-15v15m3-15v15" />
  </svg>
)
const IconCart = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" strokeLinecap="round" />
  </svg>
)

function Relogio() {
  const [agora, setAgora] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="font-mono text-sm" style={{ color: 'var(--clr-text-muted)' }}>
      {agora.toLocaleDateString('pt-BR')} — {agora.toLocaleTimeString('pt-BR')}
    </span>
  )
}

function BarraDeStatus() {
  const { user } = useAuthStore()
  const { data: sessao } = useQuery('sessao-ativa', () => api.get('/caixa/sessao-ativa').then(r => r.data), { retry: false })

  return (
    <div
      className="flex items-center justify-between px-4 py-1.5 text-xs shrink-0"
      style={{ background: 'var(--clr-sidebar)', color: 'rgba(230,240,230,0.85)' }}
    >
      <div className="flex items-center gap-4">
        <span><strong style={{ color: '#fff' }}>{user?.nome}</strong></span>
        {sessao && (
          <>
            <span>Caixa: <strong style={{ color: '#fff' }}>{sessao.caixa_nome}</strong></span>
            <span>Aberto às {new Date(sessao.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </>
        )}
      </div>
      <span className="font-mono">
        {new Date().toLocaleDateString('pt-BR')} — <Relogio />
      </span>
    </div>
  )
}

function BarraDeAtalhos({ onDesconto }: { onDesconto: () => void }) {
  const atalhos = [
    { tecla: 'F2', label: 'Buscar' },
    { tecla: 'F4', label: 'Finalizar venda' },
    { tecla: 'F9', label: 'Desconto', onClick: onDesconto },
    { tecla: 'Del', label: 'Remove item' },
    { tecla: 'Esc', label: 'Cancela venda' },
  ]
  return (
    <div
      className="flex items-center gap-1 px-3 py-1.5 shrink-0 overflow-x-auto no-scrollbar"
      style={{ background: 'var(--clr-bg)', borderTop: '1px solid var(--clr-border)' }}
    >
      {atalhos.map(a => (
        <button
          key={a.tecla}
          onClick={a.onClick}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs whitespace-nowrap"
          style={{ color: 'var(--clr-text-muted)' }}
        >
          <span
            className="font-mono font-bold px-1.5 py-0.5 rounded text-[11px]"
            style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', color: 'var(--clr-text)' }}
          >
            {a.tecla}
          </span>
          {a.label}
        </button>
      ))}
    </div>
  )
}

export default function PDVPage() {
  const isMobile = useIsMobile()
  const [showCartMobile, setShowCartMobile] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showDesconto, setShowDesconto] = useState(false)
  const [descontoInput, setDescontoInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaSel, setCategoriaSel] = useState<number | null>(null)
  const [itemSelecionado, setItemSelecionado] = useState<number | null>(null)
  const buscaRef = useRef<HTMLInputElement>(null)
  const store = usePDVStore()
  const queryClient = useQueryClient()

  const { data: todosProdutos = [] } = useQuery(['produtos-ativos'], () => api.get('/produtos?apenas_ativos=true').then(r => r.data))
  const { data: categorias = [] } = useQuery(['categorias'], () => api.get('/categorias').then(r => r.data))

  const filteredProdutos = useMemo(() => {
    let list = todosProdutos
    if (categoriaSel) list = list.filter((p: any) => p.categoria_id === categoriaSel)
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      list = list.filter((p: any) => p.nome.toLowerCase().includes(s) || p.codigo_barras?.includes(s))
    }
    return list.slice(0, 60)
  }, [todosProdutos, categoriaSel, searchTerm])

  const addProduto = useCallback((p: any) => {
    store.addItem({
      produto_id: p.id,
      nome: p.nome,
      preco_unit: parseFloat(p.preco_venda),
      custo_unit: parseFloat(p.preco_custo ?? 0),
      quantidade: 1,
      desconto_unit: 0,
      unidade_medida: p.unidade_medida,
    })
  }, [store])

  // ── Leitor de código de barras: bipou, entra direto na venda ──────────────
  const handleScan = useCallback(async (codigo: string) => {
    const local = todosProdutos.find((p: any) => p.codigo_barras === codigo)
    if (local) {
      addProduto(local)
      toast.success(local.nome, { position: 'bottom-center', duration: 1200 })
      setSearchTerm('')
      return
    }
    try {
      const { data } = await api.get(`/produtos/barcode/${codigo}`)
      addProduto(data)
      toast.success(data.nome, { position: 'bottom-center', duration: 1200 })
      setSearchTerm('')
    } catch {
      toast.error(`Código "${codigo}" não encontrado`)
      setSearchTerm(codigo)
    }
  }, [todosProdutos, addProduto])

  useBarcodeScanner({ onScan: handleScan })

  // ── Atalhos de teclado ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); buscaRef.current?.focus(); return }
      if (e.key === 'F4') { e.preventDefault(); if (store.cart.length > 0) setShowPaymentModal(true); return }
      if (e.key === 'F9') { e.preventDefault(); setShowDesconto(v => !v); return }
      if (e.key === 'Escape') {
        if (store.cart.length > 0 && confirm('Cancelar a venda em andamento? Os itens serão perdidos.')) {
          store.clearCart(); setItemSelecionado(null)
        }
        return
      }
      const foco = document.activeElement as HTMLElement | null
      const digitando = foco?.tagName === 'INPUT' || foco?.tagName === 'TEXTAREA'
      if ((e.key === 'Delete' || e.key === 'Backspace') && !digitando && itemSelecionado !== null) {
        e.preventDefault()
        store.removeItem(itemSelecionado)
        setItemSelecionado(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store, itemSelecionado])

  const createVendaMutation = useMutation(
    (payload: any) => api.post('/vendas', payload).then(r => r.data),
    {
      onSuccess: () => {
        store.clearCart(); setShowCartMobile(false); setItemSelecionado(null)
        queryClient.invalidateQueries(['estoque-alertas'])
        toast.success('Venda concluída!')
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.detail || 'Erro na venda')
      }
    }
  )

  const subtotal = store.subtotal()
  const total = store.total()

  const aplicarDesconto = () => {
    const v = parseFloat(descontoInput.replace(',', '.')) || 0
    store.setDesconto(v)
    setShowDesconto(false)
    setDescontoInput('')
  }

  return (
    <SessaoGuard>
      <div className="flex flex-col h-full w-full" style={{ background: 'var(--clr-bg)' }}>
        {!isMobile && <BarraDeStatus />}

        <div className="flex flex-1 overflow-hidden">
          {/* Catálogo */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-3 shrink-0 space-y-2" style={{ background: 'var(--clr-surface)', borderBottom: '1px solid var(--clr-border)' }}>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--clr-text-muted)' }}><IconBarcode /></div>
                <input
                  ref={buscaRef}
                  type="text"
                  placeholder="Bipe o código de barras ou digite o nome do produto — F2"
                  className="input pl-9 w-full"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && filteredProdutos.length === 1) {
                      addProduto(filteredProdutos[0]); setSearchTerm('')
                    }
                  }}
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setCategoriaSel(null)}
                  className="px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors"
                  style={!categoriaSel
                    ? { background: 'var(--clr-primary, var(--clr-green))', color: 'white' }
                    : { background: 'var(--clr-bg)', color: 'var(--clr-text-muted)', border: '1px solid var(--clr-border)' }
                  }
                >
                  Tudo
                </button>
                {categorias.map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaSel(cat.id)}
                    className="px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors"
                    style={categoriaSel === cat.id
                      ? { background: 'var(--clr-primary, var(--clr-green))', color: 'white' }
                      : { background: 'var(--clr-bg)', color: 'var(--clr-text-muted)', border: '1px solid var(--clr-border)' }
                    }
                  >
                    {cat.nome}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
                {filteredProdutos.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => addProduto(p)}
                    className="p-3 rounded-lg text-left flex flex-col justify-between min-h-[92px] transition-colors"
                    style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--clr-green)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--clr-border)'}
                  >
                    <span className="text-xs font-semibold line-clamp-3 leading-snug" style={{ color: 'var(--clr-text)' }}>{p.nome}</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono font-bold text-sm" style={{ color: 'var(--clr-green)' }}>{formatBRL(p.preco_venda)}</span>
                      <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--clr-text-muted)' }}>{p.unidade_medida}</span>
                    </div>
                  </button>
                ))}
                {filteredProdutos.length === 0 && (
                  <p className="col-span-full text-sm text-center py-8" style={{ color: 'var(--clr-text-muted)' }}>
                    Nenhum produto encontrado
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Venda em andamento */}
          <div className={`
            ${isMobile ? 'fixed inset-0 z-[200]' : 'w-[460px] flex flex-col'}
            ${isMobile && !showCartMobile ? 'pointer-events-none' : 'pointer-events-auto'}
          `} style={!isMobile ? { background: 'var(--clr-surface)', borderLeft: '1px solid var(--clr-border)' } : undefined}>
            {isMobile && (
              <div
                className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${showCartMobile ? 'opacity-100' : 'opacity-0'}`}
                onClick={() => setShowCartMobile(false)}
              />
            )}

            <div className={`
              ${isMobile ? 'absolute bottom-0 left-0 right-0 h-[85vh] rounded-t-2xl shadow-2xl' : 'h-full'}
              flex flex-col overflow-hidden transition-transform duration-200
              ${isMobile && !showCartMobile ? 'translate-y-full' : 'translate-y-0'}
            `} style={{ background: 'var(--clr-surface)' }}>
              <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--clr-border)' }}>
                <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--clr-text-muted)' }}>Venda em andamento</h2>
                {isMobile && (
                  <button onClick={() => setShowCartMobile(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--clr-bg)' }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth={2.5} strokeLinecap="round" /></svg>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-4">
                <CartPanel selecionado={itemSelecionado} onSelecionar={setItemSelecionado} />
              </div>

              <div className="p-4 space-y-2 shrink-0 safe-area-bottom" style={{ borderTop: '1px solid var(--clr-border)', background: 'var(--clr-bg)' }}>
                <div className="flex justify-between text-xs" style={{ color: 'var(--clr-text-muted)' }}>
                  <span>Subtotal</span>
                  <span className="font-mono">{formatBRL(subtotal)}</span>
                </div>

                {showDesconto ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="number" step="0.01" autoFocus
                      placeholder="Desconto em R$"
                      className="input flex-1 h-9 text-sm"
                      value={descontoInput}
                      onChange={e => setDescontoInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') aplicarDesconto(); if (e.key === 'Escape') setShowDesconto(false) }}
                    />
                    <button onClick={aplicarDesconto} className="btn-action h-9 px-3 text-sm">OK</button>
                  </div>
                ) : store.desconto > 0 ? (
                  <div className="flex justify-between text-xs" style={{ color: 'var(--clr-danger)' }}>
                    <span>Desconto (F9 pra alterar)</span>
                    <span className="font-mono">−{formatBRL(store.desconto)}</span>
                  </div>
                ) : (
                  <button onClick={() => setShowDesconto(true)} className="text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>
                    + Desconto (F9)
                  </button>
                )}

                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold uppercase text-xs tracking-wide" style={{ color: 'var(--clr-text)' }}>Total</span>
                  <span className="text-2xl font-mono font-black" style={{ color: 'var(--clr-green)' }}>{formatBRL(total)}</span>
                </div>
                <button
                  disabled={store.cart.length === 0}
                  onClick={() => { setShowCartMobile(false); setShowPaymentModal(true) }}
                  className="btn-action w-full py-3 text-sm"
                >
                  Finalizar venda (F4)
                </button>
              </div>
            </div>
          </div>

          {isMobile && store.cart.length > 0 && !showCartMobile && (
            <button
              onClick={() => setShowCartMobile(true)}
              className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-[110]"
              style={{ background: 'var(--clr-green)', color: 'white' }}
            >
              <IconCart />
              <span className="absolute -top-1 -right-1 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--clr-danger)' }}>
                {store.cart.length}
              </span>
            </button>
          )}
        </div>

        {!isMobile && <BarraDeAtalhos onDesconto={() => setShowDesconto(v => !v)} />}
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
