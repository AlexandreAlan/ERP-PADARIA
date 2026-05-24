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

const IconFecharCaixa = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
  </svg>
)

const IconSearch = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
)
const IconX = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
)
const IconTrash = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
  </svg>
)
const IconBarcode = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5v14M7 5v14M11 5v8M15 5v14M19 5v14M21 5v14M11 15v4"/>
  </svg>
)

// ── Numeric Keypad ──────────────────────────────────────────────────────────────

const KEYS = [
  ['7','8','9'],
  ['4','5','6'],
  ['1','2','3'],
  ['00','0','⌫'],
]

function NumPad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const press = (k: string) => {
    if (k === '⌫') {
      onChange(value.length <= 1 ? '1' : value.slice(0, -1))
    } else if (k === '00') {
      onChange(value === '1' ? '00' : value + '00')
    } else {
      const next = value === '1' ? k : value + k
      if (parseInt(next) > 9999) return
      onChange(next)
    }
  }

  return (
    <div
      className="shrink-0 px-4 pb-3 pt-2"
      style={{ borderTop: '1px solid var(--clr-border)' }}
    >
      {/* Display */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--clr-text-muted)' }}>
          Qtd. próximo item
        </span>
        <div
          className="font-mono font-bold text-lg px-3 py-0.5 rounded-lg min-w-[52px] text-center"
          style={{
            background: parseInt(value) > 1 ? 'var(--clr-green)' : 'var(--clr-bg)',
            color: parseInt(value) > 1 ? '#fff' : 'var(--clr-text)',
            border: '1px solid var(--clr-border)',
            transition: 'all 0.15s',
          }}
        >
          {value}×
        </div>
      </div>

      {/* Buttons grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {KEYS.flat().map(k => (
          <button
            key={k}
            onClick={() => press(k)}
            className="h-10 rounded-lg font-mono font-semibold text-sm transition-all select-none"
            style={{
              background: k === '⌫' ? 'var(--clr-danger-bg)' : 'var(--clr-surface)',
              color: k === '⌫' ? 'var(--clr-danger)' : 'var(--clr-text)',
              border: `1px solid ${k === '⌫' ? '#FCA5A5' : 'var(--clr-border)'}`,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = k === '⌫' ? '#FEE2E2' : 'var(--clr-green-pale)'
              el.style.transform = 'translateY(-1px)'
              el.style.boxShadow = '0 3px 6px rgba(45,106,79,0.1)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = k === '⌫' ? 'var(--clr-danger-bg)' : 'var(--clr-surface)'
              el.style.transform = 'translateY(0)'
              el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'
            }}
            onMouseDown={e => (e.currentTarget as HTMLElement).style.transform = 'scale(0.94)'}
            onMouseUp={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function PDVPage() {
  const [showPayment, setShowPayment]         = useState(false)
  const [showFecharCaixa, setShowFecharCaixa] = useState(false)
  const [valorFechamento, setValorFechamento] = useState('')
  const [searchTerm, setSearchTerm]           = useState('')
  const [categoriaSel, setCategoriaSel]       = useState<number | null>(null)
  const [qtyStr, setQtyStr]                   = useState('1')
  const lastQtyKeyTime                        = useRef(0)

  const { user }    = useAuthStore()
  const store       = usePDVStore()
  const queryClient = useQueryClient()

  const { data: sessaoAtiva } = useQuery(
    'sessao-ativa',
    () => api.get('/caixa/sessao-ativa').then(r => r.data),
    { enabled: showFecharCaixa }
  )

  const saldoEsperado = sessaoAtiva
    ? parseFloat(sessaoAtiva.valor_abertura) + parseFloat(sessaoAtiva.total_vendas)
      - parseFloat(sessaoAtiva.total_sangrias) + parseFloat(sessaoAtiva.total_suprimentos)
    : 0

  const fecharCaixaMutation = useMutation(
    (payload: any) => api.post(`/caixa/${store.sessaoId}/fechar`, payload).then(r => r.data),
    {
      onSuccess: (data) => {
        store.setSessaoId(null)
        store.clearCart()
        setShowFecharCaixa(false)
        setValorFechamento('')
        queryClient.invalidateQueries('sessao-ativa')
        toast.success(`Caixa fechado. Diferença: ${formatBRL(data.sessao?.diferenca || 0)}`, { duration: 5000 })
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.detail || 'Erro ao fechar caixa')
      },
    }
  )

  // F10 to pay + NumPad keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F10' && store.cart.length > 0) { e.preventDefault(); setShowPayment(true); return }

      if (showPayment) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key >= '0' && e.key <= '9') {
        const now = Date.now()
        const delta = now - lastQtyKeyTime.current
        lastQtyKeyTime.current = now
        // Teclas chegando rápido (< 100ms) indicam scanner de código de barras — ignora
        if (delta > 0 && delta < 100) return
        e.preventDefault()
        const k = e.key
        setQtyStr(prev => {
          const next = prev === '1' ? k : prev + k
          return parseInt(next) > 9999 ? prev : next
        })
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        setQtyStr(prev => prev.length <= 1 ? '1' : prev.slice(0, -1))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store.cart.length, showPayment])

  const handleBarcodeScan = useCallback(async (code: string) => {
    try {
      const { data: produto } = await api.get(`/produtos/barcode/${code}`)
      store.addItem({
        produto_id:     produto.id,
        nome:           produto.nome,
        preco_unit:     parseFloat(produto.preco_venda),
        custo_unit:     parseFloat(produto.preco_custo ?? 0),
        quantidade:     parseInt(qtyStr) || 1,
        desconto_unit:  0,
        unidade_medida: produto.unidade_medida,
      })
      setQtyStr('1')
      toast.success(`${produto.nome} adicionado`, { duration: 1500 })
    } catch (err: any) {
      if (err.response?.status === 404) toast.error(`Código '${code}' não encontrado`)
      else toast.error('Erro ao buscar produto')
    }
  }, [store, qtyStr])

  useBarcodeScanner({ onScan: handleBarcodeScan, enabled: !showPayment })

  const { data: searchResults } = useQuery(
    ['produtos-search', searchTerm],
    () => api.get(`/produtos?q=${searchTerm}&apenas_ativos=true`).then(r => r.data),
    { enabled: searchTerm.length >= 2, staleTime: 10_000 }
  )

  const { data: todosProdutos = [] } = useQuery(
    ['produtos-ativos'],
    () => api.get('/produtos?apenas_ativos=true').then(r => r.data),
    { staleTime: 60_000 }
  )

  const { data: categorias = [] } = useQuery(
    ['categorias'],
    () => api.get('/categorias').then(r => r.data),
    { staleTime: 300_000 }
  )

  const produtosGrid = useMemo(() => {
    const lista: any[] = todosProdutos
    if (!categoriaSel) return lista.slice(0, 40)
    return lista.filter((p: any) => p.categoria_id === categoriaSel).slice(0, 40)
  }, [todosProdutos, categoriaSel])

  const addProduto = (p: any) => {
    store.addItem({
      produto_id:     p.id,
      nome:           p.nome,
      preco_unit:     parseFloat(p.preco_venda),
      custo_unit:     parseFloat(p.preco_custo ?? 0),
      quantidade:     parseInt(qtyStr) || 1,
      desconto_unit:  0,
      unidade_medida: p.unidade_medida,
    })
    setQtyStr('1')
    setSearchTerm('')
  }

  const createVendaMutation = useMutation(
    (payload: any) => api.post('/vendas', payload).then(r => r.data),
    {
      onSuccess: (venda) => {
        store.clearCart()
        setShowPayment(false)
        queryClient.invalidateQueries(['estoque-alertas'])
        toast.success(`Venda #${venda.id} concluída — ${formatBRL(venda.total)}`, { duration: 4000 })
      },
      onError: (err: any) => {
        const detail = err.response?.data?.detail
        const msg = Array.isArray(detail)
          ? detail.map((d: any) => d.msg ?? JSON.stringify(d)).join(' | ')
          : typeof detail === 'string' ? detail : err.message || 'Erro ao processar venda'
        toast.error(msg, { duration: 6000 })
      },
    }
  )

  const subtotal = store.subtotal()
  const total    = store.total()
  const hasItems = store.cart.length > 0

  return (
    <SessaoGuard>
      <div className="flex h-full overflow-hidden" style={{ background: 'var(--clr-bg)' }}>

        {/* ── ESQUERDA: Catálogo ── */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Topbar */}
          <div
            className="flex items-center gap-3 px-5 py-3 shrink-0"
            style={{ background: 'var(--clr-surface)', borderBottom: '1px solid var(--clr-border)' }}
          >
            {/* Busca */}
            <div className="relative flex-1 max-w-lg">
              <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--clr-text-muted)' }}>
                <IconSearch />
              </div>
              <input
                type="text"
                placeholder="Buscar produto ou escanear código de barras..."
                className="input pl-9 h-10 text-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--clr-text-muted)' }}
                  onClick={() => setSearchTerm('')}
                >
                  <IconX />
                </button>
              )}

              {/* Dropdown de busca */}
              {searchResults && searchTerm.length >= 2 && (
                <div
                  className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-xl overflow-hidden"
                  style={{ border: '1px solid var(--clr-border)', maxHeight: 320, overflowY: 'auto' }}
                >
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-sm text-center" style={{ color: 'var(--clr-text-muted)' }}>
                      Nenhum produto encontrado
                    </div>
                  ) : searchResults.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => addProduto(p)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                      style={{ borderBottom: '1px solid var(--clr-bg)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-green-pale)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--clr-text)' }}>{p.nome}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>
                          {p.codigo_barras ? `Cód: ${p.codigo_barras}` : `Ref: #${p.id}`}{' · '}{p.unidade_medida}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-sm ml-4 shrink-0" style={{ color: 'var(--clr-green)' }}>
                        {formatBRL(p.preco_venda)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Scanner hint */}
            <div
              className="hidden lg:flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg"
              style={{ border: '1px solid var(--clr-border)', color: 'var(--clr-text-muted)', background: 'var(--clr-bg)' }}
            >
              <IconBarcode />
              Scanner ativo
            </div>
          </div>

          {/* Filtro de categorias */}
          {(categorias as any[]).length > 0 && (
            <div
              className="flex items-center gap-2 px-5 py-2 overflow-x-auto shrink-0"
              style={{ background: 'var(--clr-surface)', borderBottom: '1px solid var(--clr-border)' }}
            >
              <button
                onClick={() => setCategoriaSel(null)}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={categoriaSel === null
                  ? { background: 'var(--clr-green)', color: '#fff', boxShadow: '0 2px 6px rgba(45,106,79,0.3)' }
                  : { background: 'var(--clr-green-pale)', color: 'var(--clr-text-med)' }
                }
              >
                Todos
              </button>
              {(categorias as any[]).map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaSel(cat.id)}
                  className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  style={categoriaSel === cat.id
                    ? { background: 'var(--clr-green)', color: '#fff', boxShadow: '0 2px 6px rgba(45,106,79,0.3)' }
                    : { background: 'var(--clr-green-pale)', color: 'var(--clr-text-med)' }
                  }
                >
                  {cat.nome}
                </button>
              ))}
            </div>
          )}

          {/* Grade de produtos */}
          <div className="flex-1 overflow-y-auto p-4">
            {produtosGrid.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} style={{ color: 'var(--clr-border-2)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--clr-text-med)' }}>Nenhum produto disponível</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--clr-text-muted)' }}>Cadastre produtos no módulo Estoque</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {produtosGrid.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => addProduto(p)}
                    className="product-tile text-left flex flex-col justify-between"
                    style={{ minHeight: 90 }}
                  >
                    <span className="font-semibold text-sm leading-snug line-clamp-2 mb-2" style={{ color: 'var(--clr-text)' }}>
                      {p.nome}
                    </span>
                    <div className="space-y-1">
                      <div className="font-mono font-bold text-base" style={{ color: 'var(--clr-green)' }}>
                        {formatBRL(p.preco_venda)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--clr-bg)', color: 'var(--clr-text-muted)' }}
                        >
                          {p.unidade_medida}
                        </span>
                        {parseInt(qtyStr) > 1 && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--clr-green)', color: '#fff' }}
                          >
                            ×{qtyStr}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── DIREITA: Carrinho ── */}
        <div
          className="w-[340px] flex flex-col shrink-0"
          style={{ background: 'var(--clr-surface)', borderLeft: '1px solid var(--clr-border)' }}
        >
          {/* Header carrinho */}
          <div
            className="flex items-center justify-between px-5 py-3.5 shrink-0"
            style={{ borderBottom: '1px solid var(--clr-border)', background: 'var(--clr-sidebar)' }}
          >
            <div>
              <h2 className="font-bold text-sm" style={{ color: 'rgba(230,250,230,0.9)' }}>
                Pedido {user && <span style={{ color: 'rgba(180,220,180,0.5)', fontWeight: 400 }}>· {user.nome}</span>}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {hasItems && (
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(82,183,136,0.2)', color: 'var(--clr-accent)', border: '1px solid rgba(82,183,136,0.25)' }}
                >
                  {store.cart.length} {store.cart.length === 1 ? 'item' : 'itens'}
                </span>
              )}
              {/* Botão Fechar Caixa */}
              <button
                onClick={() => setShowFecharCaixa(true)}
                title="Fechar Caixa"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.25)' }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = 'rgba(239,68,68,0.28)'
                  el.style.color = '#FEE2E2'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = 'rgba(239,68,68,0.15)'
                  el.style.color = '#FCA5A5'
                }}
              >
                <IconFecharCaixa />
                Fechar Caixa
              </button>
            </div>
          </div>

          {/* Itens */}
          <div className="flex-1 overflow-y-auto p-3">
            <CartPanel />
          </div>

          {/* Teclado numérico */}
          <NumPad value={qtyStr} onChange={setQtyStr} />

          {/* Totais + ações */}
          <div className="px-4 py-3 shrink-0 space-y-2.5" style={{ borderTop: '1px solid var(--clr-border)' }}>
            {store.desconto > 0 && (
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--clr-text-muted)' }}>Subtotal</span>
                <span className="font-mono" style={{ color: 'var(--clr-text)' }}>{formatBRL(subtotal)}</span>
              </div>
            )}

            <div
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{
                background: 'linear-gradient(135deg, var(--clr-green), var(--clr-green-med))',
                boxShadow: '0 4px 12px rgba(45,106,79,0.3)',
              }}
            >
              <span className="font-semibold text-sm text-white opacity-80">Total</span>
              <span className="font-mono font-bold text-2xl text-white">{formatBRL(total)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { if (hasItems && confirm('Limpar o pedido?')) store.clearCart() }}
                disabled={!hasItems}
                className="btn-bakery flex items-center justify-center gap-1.5 py-2.5 text-sm disabled:opacity-30"
              >
                <IconTrash />
                Limpar
              </button>
              <button
                onClick={() => setShowPayment(true)}
                disabled={!hasItems}
                className="btn-action py-2.5 text-sm"
              >
                Finalizar
                <kbd className="ml-1 text-[10px] opacity-60 font-sans">F10</kbd>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          total={total}
          onConfirm={(pagamentos) => {
            if (!store.sessaoId) return toast.error('Nenhuma sessão de caixa aberta')
            createVendaMutation.mutate({
              sessao_id:      store.sessaoId,
              itens:          store.cart.map(c => ({
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

      {/* Modal Fechar Caixa */}
      {showFecharCaixa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(25,40,25,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" style={{ border: '1px solid var(--clr-border)' }}>
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
              <div>
                <h2 className="font-bold text-base" style={{ color: '#991B1B' }}>Fechar Caixa</h2>
                <p className="text-xs mt-0.5" style={{ color: '#B91C1C' }}>Informe o valor físico contado em caixa</p>
              </div>
              <button
                onClick={() => { setShowFecharCaixa(false); setValorFechamento('') }}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ color: '#B91C1C' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FECACA'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            {/* Body */}
            <div className="p-6 space-y-4">
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--clr-green-pale)', border: '1px solid var(--clr-border-2)' }}
              >
                <span style={{ color: 'var(--clr-text-muted)' }}>Saldo esperado</span>
                <span className="font-mono font-bold" style={{ color: 'var(--clr-green)' }}>{formatBRL(saldoEsperado)}</span>
              </div>
              <div>
                <label className="label">Valor contado em espécie (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorFechamento}
                  onChange={e => setValorFechamento(e.target.value)}
                  className="input h-14 text-2xl font-mono text-center"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setShowFecharCaixa(false); setValorFechamento('') }}
                  className="btn-bakery flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => fecharCaixaMutation.mutate({ valor_fechamento: parseFloat(valorFechamento) || 0 })}
                  disabled={fecharCaixaMutation.isLoading}
                  className="btn-danger flex-1"
                >
                  {fecharCaixaMutation.isLoading ? 'Fechando...' : 'Confirmar Fechamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SessaoGuard>
  )
}
