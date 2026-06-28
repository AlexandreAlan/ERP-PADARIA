import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { formatBRL } from '@/utils/currency'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Fornecedor {
  id: number
  razao_social: string
  cnpj?: string
  telefone?: string
  email?: string
  ativo: boolean
}

interface Produto {
  id: number
  nome: string
  preco_custo: number
  unidade_medida: string
  estoque_atual: number
}

interface ItemCompraOut {
  id: number
  produto_id: number
  produto_nome: string
  quantidade: number
  custo_unit: number
  total_item: number
}

interface CompraOut {
  id: number
  fornecedor_id: number
  fornecedor_nome: string
  status: 'rascunho' | 'confirmado' | 'recebido' | 'cancelado'
  total: number
  nota_fiscal?: string
  data_entrega?: string
  created_at: string
  itens: ItemCompraOut[]
}

interface ItemForm {
  produto_id: number
  produto_nome: string
  quantidade: string
  custo_unit: string
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconPlus = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)
const IconCheck = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)
const IconTrash = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
)
const IconX = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18L18 6M6 6l12 12" />
  </svg>
)
const IconChevron = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
)
const IconPackage = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
)

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  rascunho:  'Rascunho',
  confirmado: 'Aguardando',
  recebido:  'Recebido',
  cancelado: 'Cancelado',
}
const STATUS_COLOR: Record<string, string> = {
  rascunho:  'bg-gray-100 text-gray-600',
  confirmado: 'bg-amber-50 text-amber-700',
  recebido:  'bg-emerald-50 text-emerald-700',
  cancelado: 'bg-red-50 text-red-600',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

// ─── Nova Compra Modal ────────────────────────────────────────────────────────

function NovaCompraModal({
  fornecedores,
  produtos,
  onClose,
  onSuccess,
}: {
  fornecedores: Fornecedor[]
  produtos: Produto[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [fornecedorId, setFornecedorId] = useState('')
  const [notaFiscal, setNotaFiscal]     = useState('')
  const [dataEntrega, setDataEntrega]   = useState('')
  const [itens, setItens]               = useState<ItemForm[]>([])
  const [produtoSel, setProdutoSel]     = useState('')
  const [qtd, setQtd]                   = useState('')
  const [custo, setCusto]               = useState('')

  const qc = useQueryClient()
  const { mutate: criar, isLoading } = useMutation(
    () => api.post('/compras', {
      fornecedor_id: Number(fornecedorId),
      nota_fiscal:   notaFiscal || null,
      data_entrega:  dataEntrega || null,
      itens: itens.map(i => ({
        produto_id: i.produto_id,
        quantidade: parseFloat(i.quantidade.replace(',', '.')),
        custo_unit: parseFloat(i.custo_unit.replace(',', '.')),
      })),
    }),
    {
      onSuccess: () => {
        toast.success('Compra registrada!')
        qc.invalidateQueries('compras')
        onSuccess()
      },
      onError: (err: any) => { toast.error(err.response?.data?.detail ?? 'Erro ao registrar compra') },
    }
  )

  const adicionarItem = () => {
    const prod = produtos.find(p => p.id === Number(produtoSel))
    if (!prod || !qtd || !custo) { toast.error('Preencha produto, quantidade e custo'); return }
    if (itens.some(i => i.produto_id === prod.id)) { toast.error('Produto já adicionado'); return }
    setItens(prev => [...prev, { produto_id: prod.id, produto_nome: prod.nome, quantidade: qtd, custo_unit: custo }])
    setProdutoSel(''); setQtd(''); setCusto('')
  }

  const removerItem = (id: number) => setItens(prev => prev.filter(i => i.produto_id !== id))

  const total = itens.reduce((acc, i) => {
    const q = parseFloat(i.quantidade.replace(',', '.')) || 0
    const c = parseFloat(i.custo_unit.replace(',', '.')) || 0
    return acc + q * c
  }, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fornecedorId) { toast.error('Selecione o fornecedor'); return }
    if (!itens.length)  { toast.error('Adicione ao menos um item'); return }
    criar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,30,15,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" style={{ border: '1px solid var(--clr-border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--clr-border)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--clr-text)' }}>Nova Compra</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <IconX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-4">
            {/* Fornecedor + NF + Entrega */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--clr-text-muted)' }}>Fornecedor *</label>
                <select
                  value={fornecedorId}
                  onChange={e => setFornecedorId(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
                  required
                >
                  <option value="">Selecione...</option>
                  {fornecedores.map(f => (
                    <option key={f.id} value={f.id}>{f.razao_social}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--clr-text-muted)' }}>Nota Fiscal</label>
                <input
                  type="text"
                  value={notaFiscal}
                  onChange={e => setNotaFiscal(e.target.value)}
                  placeholder="ex: NF-001234"
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--clr-text-muted)' }}>Previsão de Entrega</label>
                <input
                  type="date"
                  value={dataEntrega}
                  onChange={e => setDataEntrega(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
                />
              </div>
            </div>

            {/* Adicionar item */}
            <div style={{ borderTop: '1px solid var(--clr-border)', paddingTop: '1rem' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--clr-text-muted)' }}>Itens da compra</p>
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-5">
                  <select
                    value={produtoSel}
                    onChange={e => {
                      setProdutoSel(e.target.value)
                      const p = produtos.find(x => x.id === Number(e.target.value))
                      if (p?.preco_custo) setCusto(String(p.preco_custo))
                    }}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
                  >
                    <option value="">Selecione o produto...</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={qtd}
                    onChange={e => setQtd(e.target.value)}
                    placeholder="Qtd"
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    value={custo}
                    onChange={e => setCusto(e.target.value)}
                    placeholder="Custo unit. R$"
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
                  />
                </div>
                <div className="col-span-2">
                  <button
                    type="button"
                    onClick={adicionarItem}
                    className="w-full h-full flex items-center justify-center gap-1 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ background: 'var(--clr-primary)' }}
                  >
                    <IconPlus />
                    Add
                  </button>
                </div>
              </div>

              {itens.length > 0 ? (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--clr-border)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'var(--clr-bg)' }}>
                        <th className="text-left px-3 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>Produto</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>Qtd</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>Custo</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>Total</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map(it => {
                        const q = parseFloat(it.quantidade.replace(',', '.')) || 0
                        const c = parseFloat(it.custo_unit.replace(',', '.')) || 0
                        return (
                          <tr key={it.produto_id} style={{ borderTop: '1px solid var(--clr-border)' }}>
                            <td className="px-3 py-2 text-sm" style={{ color: 'var(--clr-text)' }}>{it.produto_nome}</td>
                            <td className="px-3 py-2 text-sm text-right" style={{ color: 'var(--clr-text)' }}>{it.quantidade}</td>
                            <td className="px-3 py-2 text-sm text-right" style={{ color: 'var(--clr-text)' }}>{formatBRL(c)}</td>
                            <td className="px-3 py-2 text-sm text-right font-semibold" style={{ color: 'var(--clr-text)' }}>{formatBRL(q * c)}</td>
                            <td className="px-2 py-2">
                              <button type="button" onClick={() => removerItem(it.produto_id)} className="text-red-400 hover:text-red-600 transition-colors">
                                <IconTrash />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-sm" style={{ color: 'var(--clr-text-muted)', border: '1.5px dashed var(--clr-border)', borderRadius: '12px' }}>
                  Nenhum item adicionado
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--clr-border)' }}>
            <div>
              <span className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>Total da compra</span>
              <div className="font-bold text-lg" style={{ color: 'var(--clr-primary)' }}>{formatBRL(total)}</div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-gray-50" style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || !itens.length}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'var(--clr-primary)' }}
              >
                {isLoading ? 'Salvando...' : 'Registrar Compra'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Detalhe da Compra ────────────────────────────────────────────────────────

function CompraDetalhes({ compra, onReceber, isRecebing }: { compra: CompraOut; onReceber: () => void; isRecebing: boolean }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--clr-border)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--clr-bg)', borderBottom: '1px solid var(--clr-border)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold" style={{ color: 'var(--clr-text)' }}>#{compra.id} — {compra.fornecedor_nome}</span>
          <StatusBadge status={compra.status} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>{compra.created_at}</span>
          {compra.status === 'confirmado' && (
            <button
              onClick={onReceber}
              disabled={isRecebing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: '#16a34a' }}
            >
              <IconCheck />
              {isRecebing ? 'Recebendo...' : 'Receber'}
            </button>
          )}
        </div>
      </div>
      {compra.itens.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--clr-bg-subtle, #f9fafb)' }}>
              <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>Produto</th>
              <th className="text-right px-4 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>Qtd</th>
              <th className="text-right px-4 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>Custo unit.</th>
              <th className="text-right px-4 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {compra.itens.map(it => (
              <tr key={it.id} style={{ borderTop: '1px solid var(--clr-border)' }}>
                <td className="px-4 py-2" style={{ color: 'var(--clr-text)' }}>{it.produto_nome}</td>
                <td className="px-4 py-2 text-right" style={{ color: 'var(--clr-text)' }}>{Number(it.quantidade)}</td>
                <td className="px-4 py-2 text-right" style={{ color: 'var(--clr-text)' }}>{formatBRL(it.custo_unit)}</td>
                <td className="px-4 py-2 text-right font-semibold" style={{ color: 'var(--clr-text)' }}>{formatBRL(it.total_item)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--clr-border)' }}>
              <td colSpan={3} className="px-4 py-2 text-right text-sm font-bold" style={{ color: 'var(--clr-text)' }}>Total</td>
              <td className="px-4 py-2 text-right font-bold" style={{ color: 'var(--clr-primary)' }}>{formatBRL(compra.total)}</td>
            </tr>
          </tfoot>
        </table>
      )}
      {(compra.nota_fiscal || compra.data_entrega) && (
        <div className="px-4 py-2 flex gap-4 text-xs" style={{ borderTop: '1px solid var(--clr-border)', color: 'var(--clr-text-muted)' }}>
          {compra.nota_fiscal && <span>NF: {compra.nota_fiscal}</span>}
          {compra.data_entrega && <span>Entrega prevista: {compra.data_entrega}</span>}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ComprasPage() {
  const [showModal, setShowModal]         = useState(false)
  const [expandedId, setExpandedId]       = useState<number | null>(null)
  const [filtroStatus, setFiltroStatus]   = useState<string>('todos')
  const qc = useQueryClient()

  const { data: compras = [], isLoading } = useQuery<CompraOut[]>('compras', () =>
    api.get('/compras').then(r => r.data)
  )

  const { data: fornecedores = [] } = useQuery<Fornecedor[]>('fornecedores', () =>
    api.get('/fornecedores').then(r => r.data)
  )

  const { data: produtos = [] } = useQuery<Produto[]>('produtos-ativos', () =>
    api.get('/produtos').then(r => r.data)
  )

  const { mutate: receber, isLoading: isRecebing, variables: recebendoId } = useMutation(
    (id: number) => api.post(`/compras/${id}/receber`),
    {
      onSuccess: () => {
        toast.success('Compra recebida! Estoque atualizado.')
        qc.invalidateQueries('compras')
      },
      onError: (err: any) => { toast.error(err.response?.data?.detail ?? 'Erro ao receber compra') },
    }
  )

  const comprasFiltradas = filtroStatus === 'todos'
    ? compras
    : compras.filter(c => c.status === filtroStatus)

  const totalPendente = compras
    .filter(c => c.status === 'confirmado')
    .reduce((acc, c) => acc + Number(c.total), 0)

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--clr-primary-light, #dcfce7)', color: 'var(--clr-primary)' }}>
            <IconPackage />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--clr-text)' }}>Compras</h1>
            <p className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>Registro de pedidos e recebimento de mercadoria</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'var(--clr-primary)' }}
        >
          <IconPlus />
          Nova Compra
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total de compras', value: String(compras.length), color: 'var(--clr-text)' },
          { label: 'Aguardando recebimento', value: String(compras.filter(c => c.status === 'confirmado').length), color: '#b45309' },
          { label: 'Já recebidas', value: String(compras.filter(c => c.status === 'recebido').length), color: '#16a34a' },
          { label: 'Valor pendente', value: formatBRL(totalPendente), color: '#b45309' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl p-4" style={{ border: '1px solid var(--clr-border)', background: 'var(--clr-card, white)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--clr-text-muted)' }}>{kpi.label}</p>
            <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filtro de status */}
      <div className="flex gap-2 flex-wrap">
        {['todos', 'confirmado', 'recebido', 'cancelado'].map(s => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={filtroStatus === s
              ? { background: 'var(--clr-primary)', color: 'white' }
              : { background: 'var(--clr-bg)', color: 'var(--clr-text-muted)', border: '1px solid var(--clr-border)' }
            }
          >
            {s === 'todos' ? 'Todas' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--clr-text-muted)' }}>Carregando...</div>
      ) : comprasFiltradas.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--clr-text-muted)' }}>Nenhuma compra encontrada</div>
      ) : (
        <div className="space-y-3">
          {comprasFiltradas.map(compra => (
            <div key={compra.id}>
              {/* Row clicável */}
              <button
                onClick={() => setExpandedId(expandedId === compra.id ? null : compra.id)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all text-left hover:shadow-sm"
                style={{
                  border: `1px solid ${expandedId === compra.id ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
                  background: expandedId === compra.id ? 'var(--clr-primary-light, #f0fdf4)' : 'var(--clr-card, white)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: 'var(--clr-text)' }}>#{compra.id}</span>
                  <span className="text-sm" style={{ color: 'var(--clr-text)' }}>{compra.fornecedor_nome}</span>
                  <StatusBadge status={compra.status} />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold" style={{ color: 'var(--clr-text)' }}>{formatBRL(compra.total)}</span>
                  <span className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>{compra.created_at}</span>
                  <span style={{ color: 'var(--clr-text-muted)', transform: expandedId === compra.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                    <IconChevron />
                  </span>
                </div>
              </button>

              {/* Detalhe expandido */}
              {expandedId === compra.id && (
                <div className="mt-2 ml-2">
                  <CompraDetalhes
                    compra={compra}
                    onReceber={() => receber(compra.id)}
                    isRecebing={isRecebing && recebendoId === compra.id}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <NovaCompraModal
          fornecedores={fornecedores}
          produtos={produtos}
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
