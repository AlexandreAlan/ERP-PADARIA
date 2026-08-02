import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { usePDVStore } from '@/store/pdvStore'
import { useAuthStore } from '@/store/authStore'
import { useEmpresaStore } from '@/store/empresaStore'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { formatBRL } from '@/utils/currency'
import CartPanel from './CartPanel'
import PaymentModal from './PaymentModal'
import ClienteModal from './ClienteModal'
import SessaoGuard from './SessaoGuard'
import { useIsMobile } from '@/Mobile/Android/useIsMobile'

const COR = {
  bg: '#0a0a0b', surface: '#141416', surface2: '#1a1a1c', surface3: '#222224',
  border: 'rgba(255,255,255,0.08)', text: '#f5f5f5', muted: '#9ca3af', mutedDim: '#6b7280',
  verde: '#22c55e', azul: '#3b82f6', vermelho: '#ef4444', laranja: '#f59e0b', roxo: '#8b5cf6',
}

const IconBarcode = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.75 4.5v15m4.5-15v15m3-15v15m3-15v15m4.5-15v15m3-15v15" />
  </svg>
)
const IconCliente = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
)
const IconDesconto = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  useEffect(() => { const t = setInterval(() => setAgora(new Date()), 1000); return () => clearInterval(t) }, [])
  return <span className="font-mono text-sm" style={{ color: COR.muted }}>{agora.toLocaleTimeString('pt-BR')}</span>
}

const IconSair = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
  </svg>
)

function BarraDeStatus() {
  const { user } = useAuthStore()
  const empresa = useEmpresaStore(s => s.empresa)
  const navigate = useNavigate()
  const { data: sessao } = useQuery('sessao-ativa', () => api.get('/caixa/sessao-ativa').then(r => r.data), { retry: false })

  return (
    <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: COR.surface, borderBottom: `1px solid ${COR.border}` }}>
      <div className="flex items-center gap-2.5">
        <button onClick={() => navigate('/dashboard')} title="Voltar ao painel" className="flex items-center gap-1.5 pr-2" style={{ color: COR.mutedDim }}>
          <IconSair />
        </button>
        <span className="font-bold text-sm" style={{ color: COR.text }}>{empresa?.nome ?? 'PDV'}</span>
        <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: COR.verde }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: COR.verde }} />
          Online
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs" style={{ color: COR.muted }}>
        <span>{user?.nome}</span>
        {sessao && (
          <>
            <span>Caixa: <strong style={{ color: COR.text }}>{sessao.caixa_nome}</strong></span>
            <span>Aberto às {new Date(sessao.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </>
        )}
        <Relogio />
      </div>
    </div>
  )
}

function BarraDeAtalhos() {
  const atalhos = [
    { tecla: 'F2', label: 'Buscar' },
    { tecla: 'F4', label: 'Finalizar venda' },
    { tecla: 'F9', label: 'Desconto' },
    { tecla: 'Del', label: 'Remove item' },
    { tecla: 'Esc', label: 'Cancela venda' },
  ]
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 shrink-0 overflow-x-auto no-scrollbar" style={{ background: COR.bg, borderTop: `1px solid ${COR.border}` }}>
      {atalhos.map(a => (
        <span key={a.tecla} className="flex items-center gap-1.5 px-2 py-1 rounded text-xs whitespace-nowrap" style={{ color: COR.mutedDim }}>
          <span className="font-mono font-bold px-1.5 py-0.5 rounded text-[11px]" style={{ background: COR.surface3, border: `1px solid ${COR.border}`, color: COR.muted }}>
            {a.tecla}
          </span>
          {a.label}
        </span>
      ))}
    </div>
  )
}

function AcaoRapida({ icone, label, cor, valor, onClick }: { icone: React.ReactNode; label: string; cor: string; valor?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors shrink-0" style={{ background: COR.surface2, border: `1px solid ${COR.border}` }}>
      <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${cor}22`, color: cor }}>{icone}</span>
      <span className="text-xs font-semibold text-left" style={{ color: COR.text }}>
        {label}
        {valor && <span className="block font-normal" style={{ color: COR.muted }}>{valor}</span>}
      </span>
    </button>
  )
}

function ProdutoCard({ p, onClick }: { p: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl text-left flex flex-col overflow-hidden transition-colors min-h-[128px]"
      style={{ background: COR.surface2, border: `1px solid ${COR.border}` }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = COR.verde}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = COR.border}
    >
      {p.imagem_url ? (
        <img src={p.imagem_url} alt="" className="w-full h-16 object-cover" />
      ) : (
        <div className="w-full h-16 flex items-center justify-center text-xl font-bold" style={{ background: COR.surface3, color: COR.mutedDim }}>
          {p.nome.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="p-2 flex-1 flex flex-col justify-between">
        <span className="text-xs font-semibold line-clamp-2 leading-snug" style={{ color: COR.text }}>{p.nome}</span>
        <div className="flex items-center justify-between mt-1">
          <span className="font-mono font-bold text-sm" style={{ color: COR.verde }}>{formatBRL(p.preco_venda)}</span>
          <span className="text-[9px] uppercase font-bold" style={{ color: COR.mutedDim }}>{p.unidade_medida}</span>
        </div>
      </div>
    </button>
  )
}

export default function PDVPage() {
  const isMobile = useIsMobile()
  const [showCartMobile, setShowCartMobile] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showClienteModal, setShowClienteModal] = useState(false)
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
      produto_id: p.id, nome: p.nome, preco_unit: parseFloat(p.preco_venda),
      custo_unit: parseFloat(p.preco_custo ?? 0), quantidade: 1, desconto_unit: 0, unidade_medida: p.unidade_medida,
    })
  }, [store])

  const handleScan = useCallback(async (codigo: string) => {
    const local = todosProdutos.find((p: any) => p.codigo_barras === codigo)
    if (local) { addProduto(local); toast.success(local.nome, { position: 'bottom-center', duration: 1200 }); setSearchTerm(''); return }
    try {
      const { data } = await api.get(`/produtos/barcode/${codigo}`)
      addProduto(data); toast.success(data.nome, { position: 'bottom-center', duration: 1200 }); setSearchTerm('')
    } catch {
      toast.error(`Código "${codigo}" não encontrado`); setSearchTerm(codigo)
    }
  }, [todosProdutos, addProduto])

  useBarcodeScanner({ onScan: handleScan })

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
        e.preventDefault(); store.removeItem(itemSelecionado); setItemSelecionado(null)
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
      onError: (err: any) => { toast.error(err.response?.data?.detail || 'Erro na venda') },
    }
  )

  const subtotal = store.subtotal()
  const total = store.total()

  const aplicarDesconto = () => {
    store.setDesconto(parseFloat(descontoInput.replace(',', '.')) || 0)
    setShowDesconto(false); setDescontoInput('')
  }

  return (
    <SessaoGuard>
      <div className="fixed inset-0 flex flex-col" style={{ background: COR.bg }}>
        {!isMobile && <BarraDeStatus />}

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-3 shrink-0 space-y-2.5" style={{ borderBottom: `1px solid ${COR.border}` }}>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COR.muted }}><IconBarcode /></div>
                <input
                  ref={buscaRef}
                  type="text"
                  placeholder="Bipe o código de barras ou digite o nome do produto — F2"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: COR.surface2, border: `1px solid ${COR.border}`, color: COR.text }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && filteredProdutos.length === 1) { addProduto(filteredProdutos[0]); setSearchTerm('') } }}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <AcaoRapida icone={<IconCliente />} cor={COR.azul} label={store.clienteNome ?? 'Cliente'} onClick={() => setShowClienteModal(true)} />
                <AcaoRapida icone={<IconDesconto />} cor={COR.verde} label={store.desconto > 0 ? 'Desconto' : 'Desconto'} valor={store.desconto > 0 ? `−${formatBRL(store.desconto)}` : undefined} onClick={() => setShowDesconto(v => !v)} />
              </div>

              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setCategoriaSel(null)}
                  className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors"
                  style={!categoriaSel ? { background: COR.verde, color: '#0a0a0a' } : { background: COR.surface2, color: COR.muted, border: `1px solid ${COR.border}` }}
                >
                  Tudo
                </button>
                {categorias.map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaSel(cat.id)}
                    className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors"
                    style={categoriaSel === cat.id ? { background: COR.verde, color: '#0a0a0a' } : { background: COR.surface2, color: COR.muted, border: `1px solid ${COR.border}` }}
                  >
                    {cat.nome}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {filteredProdutos.map((p: any) => (
                  <ProdutoCard key={p.id} p={p} onClick={() => addProduto(p)} />
                ))}
                {filteredProdutos.length === 0 && (
                  <p className="col-span-full text-sm text-center py-8" style={{ color: COR.muted }}>Nenhum produto encontrado</p>
                )}
              </div>
            </div>
          </div>

          <div className={`
            ${isMobile ? 'fixed inset-0 z-[200]' : 'w-[440px] flex flex-col'}
            ${isMobile && !showCartMobile ? 'pointer-events-none' : 'pointer-events-auto'}
          `} style={!isMobile ? { background: COR.surface, borderLeft: `1px solid ${COR.border}` } : undefined}>
            {isMobile && (
              <div className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${showCartMobile ? 'opacity-100' : 'opacity-0'}`} onClick={() => setShowCartMobile(false)} />
            )}

            <div className={`
              ${isMobile ? 'absolute bottom-0 left-0 right-0 h-[85vh] rounded-t-2xl shadow-2xl' : 'h-full'}
              flex flex-col overflow-hidden transition-transform duration-200
              ${isMobile && !showCartMobile ? 'translate-y-full' : 'translate-y-0'}
            `} style={{ background: COR.surface }}>
              <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: `1px solid ${COR.border}` }}>
                <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: COR.muted }}>Venda em andamento</h2>
                {isMobile && (
                  <button onClick={() => setShowCartMobile(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: COR.surface3 }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: COR.muted }}><path d="M19 9l-7 7-7-7" strokeWidth={2.5} strokeLinecap="round" /></svg>
                  </button>
                )}
              </div>

              {store.clienteNome && (
                <div className="px-4 py-2 flex items-center justify-between text-xs shrink-0" style={{ borderBottom: `1px solid ${COR.border}`, color: COR.azul }}>
                  <span>Cliente: <strong>{store.clienteNome}</strong></span>
                  <button onClick={() => store.setCliente(null, null)} style={{ color: COR.mutedDim }}>remover</button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-3">
                <CartPanel selecionado={itemSelecionado} onSelecionar={setItemSelecionado} />
              </div>

              <div className="p-4 space-y-2 shrink-0 safe-area-bottom" style={{ borderTop: `1px solid ${COR.border}`, background: COR.bg }}>
                <div className="flex justify-between text-xs" style={{ color: COR.muted }}>
                  <span>Subtotal</span>
                  <span className="font-mono">{formatBRL(subtotal)}</span>
                </div>

                {showDesconto ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="number" step="0.01" autoFocus
                      placeholder="Desconto em R$"
                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: COR.surface2, border: `1px solid ${COR.border}`, color: COR.text }}
                      value={descontoInput}
                      onChange={e => setDescontoInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') aplicarDesconto(); if (e.key === 'Escape') setShowDesconto(false) }}
                    />
                    <button onClick={aplicarDesconto} className="px-3 py-2 rounded-lg text-sm font-bold" style={{ background: COR.verde, color: '#0a0a0a' }}>OK</button>
                  </div>
                ) : store.desconto > 0 ? (
                  <div className="flex justify-between text-xs" style={{ color: COR.vermelho }}>
                    <span>Desconto (F9 pra alterar)</span>
                    <span className="font-mono">−{formatBRL(store.desconto)}</span>
                  </div>
                ) : null}

                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold uppercase text-xs tracking-wide" style={{ color: COR.text }}>Total</span>
                  <span className="text-2xl font-mono font-black" style={{ color: COR.verde }}>{formatBRL(total)}</span>
                </div>
                <button
                  disabled={store.cart.length === 0}
                  onClick={() => { setShowCartMobile(false); setShowPaymentModal(true) }}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-40"
                  style={{ background: COR.verde, color: '#0a0a0a' }}
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
              style={{ background: COR.verde, color: '#0a0a0a' }}
            >
              <IconCart />
              <span className="absolute -top-1 -right-1 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center" style={{ background: COR.vermelho }}>
                {store.cart.length}
              </span>
            </button>
          )}
        </div>

        {!isMobile && <BarraDeAtalhos />}
      </div>

      {showClienteModal && (
        <ClienteModal onClose={() => setShowClienteModal(false)} onSelect={(id, nome) => store.setCliente(id, nome)} />
      )}

      {showPaymentModal && (
        <PaymentModal
          total={total}
          isLoading={createVendaMutation.isLoading}
          onCancel={() => setShowPaymentModal(false)}
          onConfirm={(pagamentos) => {
            if (!store.sessaoId) { toast.error('Nenhuma sessão de caixa aberta'); return }
            createVendaMutation.mutate(
              {
                sessao_id: store.sessaoId,
                cliente_id: store.clienteId,
                itens: store.cart.map((item) => ({ produto_id: item.produto_id, quantidade: item.quantidade, desconto_unit: item.desconto_unit })),
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
