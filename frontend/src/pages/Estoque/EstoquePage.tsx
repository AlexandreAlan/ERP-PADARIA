import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { formatBRL } from '@/utils/currency'

interface Produto {
  id: number
  codigo_barras?: string
  nome: string
  categoria_id: number
  categoria_nome?: string
  preco_custo: number
  preco_venda: number
  margem_lucro: number
  estoque_atual: number
  estoque_minimo: number
  unidade_medida: string
  estoque_baixo: boolean
  ativo: boolean
}

interface Categoria {
  id: number
  nome: string
}

const UNIDADES = ['un', 'kg', 'g', 'l', 'ml', 'pct']

const emptyForm = {
  nome: '',
  codigo_barras: '',
  categoria_id: '',
  preco_venda: '',
  preco_custo: '',
  unidade_medida: 'un',
  estoque_atual: '0',
  estoque_minimo: '0',
  descricao: '',
}

function StockBar({ atual, minimo }: { atual: number; minimo: number }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const max = Math.max(minimo * 4, atual * 1.2, 1)
    const pct = Math.min((atual / max) * 100, 100)
    const t = setTimeout(() => setWidth(pct), 120)
    return () => clearTimeout(t)
  }, [atual, minimo])

  const cor = atual <= 0       ? 'var(--clr-danger)'
            : atual <= minimo  ? '#F59E0B'
            : 'var(--clr-green-med)'

  return (
    <div className="w-full h-1 rounded-full mt-1" style={{ background: 'var(--clr-bg)' }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: cor,
          transition: 'width 0.65s cubic-bezier(0.22,0.61,0.36,1)',
        }}
      />
    </div>
  )
}

const IconClose = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18L18 6M6 6l12 12"/>
  </svg>
)

const IconWarning = () => (
  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--clr-warning)' }}>
    <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
  </svg>
)

const IconBarcode = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"/>
  </svg>
)

export default function EstoquePage() {
  const [busca, setBusca]           = useState('')
  const [ajuste, setAjuste]         = useState<any>(null)
  const [showForm, setShowForm]     = useState(false)
  const [editando, setEditando]     = useState<Produto | null>(null)
  const [form, setForm]             = useState({ ...emptyForm })
  const [confirmDel, setConfirmDel] = useState<Produto | null>(null)
  const barcodeInputRef             = useRef<HTMLInputElement>(null)
  const queryClient                 = useQueryClient()

  const { data: produtos, isLoading } = useQuery(
    ['produtos', busca],
    () => api.get(`/produtos?q=${busca}&apenas_ativos=true`).then(r => r.data),
    { staleTime: 10_000 }
  )

  const { data: categorias } = useQuery(
    'categorias',
    () => api.get('/produtos/categorias/all').then(r => r.data),
    { staleTime: 60_000 }
  )

  const criarM = useMutation(
    (payload: any) => api.post('/produtos', payload).then(r => r.data),
    {
      onSuccess: () => {
        toast.success('Produto cadastrado!')
        queryClient.invalidateQueries('produtos')
        fecharForm()
      },
      onError: (e: any) => { toast.error(e.response?.data?.detail || 'Erro ao cadastrar') },
    }
  )

  const editarM = useMutation(
    ({ id, payload }: any) => api.put(`/produtos/${id}`, payload).then(r => r.data),
    {
      onSuccess: () => {
        toast.success('Produto atualizado!')
        queryClient.invalidateQueries('produtos')
        fecharForm()
      },
      onError: (e: any) => { toast.error(e.response?.data?.detail || 'Erro ao atualizar') },
    }
  )

  const deletarM = useMutation(
    (id: number) => api.delete(`/produtos/${id}`),
    {
      onSuccess: () => {
        toast.success('Produto removido')
        queryClient.invalidateQueries('produtos')
        setConfirmDel(null)
      },
      onError: (e: any) => { toast.error(e.response?.data?.detail || 'Erro ao remover') },
    }
  )

  const ajusteM = useMutation(
    (payload: any) => api.post('/estoque/ajuste', payload).then(r => r.data),
    {
      onSuccess: (data) => {
        toast.success(`Estoque atualizado. Saldo: ${data.saldo_atual}`)
        queryClient.invalidateQueries('produtos')
        setAjuste(null)
      },
      onError: (e: any) => { toast.error(e.response?.data?.detail || 'Erro no ajuste') },
    }
  )

  function abrirNovo() {
    setEditando(null)
    setForm({ ...emptyForm })
    setShowForm(true)
    setTimeout(() => barcodeInputRef.current?.focus(), 100)
  }

  function abrirEditar(p: Produto) {
    setEditando(p)
    setForm({
      nome: p.nome,
      codigo_barras: p.codigo_barras || '',
      categoria_id: String(p.categoria_id),
      preco_venda: String(p.preco_venda),
      preco_custo: String(p.preco_custo),
      unidade_medida: p.unidade_medida,
      estoque_atual: String(p.estoque_atual),
      estoque_minimo: String(p.estoque_minimo),
      descricao: '',
    })
    setShowForm(true)
  }

  function fecharForm() {
    setShowForm(false)
    setEditando(null)
    setForm({ ...emptyForm })
  }

  function salvar() {
    if (!form.nome.trim()) return toast.error('Nome é obrigatório')
    if (!form.categoria_id) return toast.error('Selecione uma categoria')
    if (!form.preco_venda || parseFloat(form.preco_venda) <= 0) return toast.error('Preço de venda inválido')

    const payload: any = {
      nome: form.nome.trim(),
      codigo_barras: form.codigo_barras.trim() || undefined,
      categoria_id: parseInt(form.categoria_id),
      preco_venda: parseFloat(form.preco_venda),
      preco_custo: parseFloat(form.preco_custo) || 0,
      unidade_medida: form.unidade_medida,
      estoque_minimo: parseFloat(form.estoque_minimo) || 0,
    }

    if (editando) {
      editarM.mutate({ id: editando.id, payload })
    } else {
      payload.estoque_atual = parseFloat(form.estoque_atual) || 0
      criarM.mutate(payload)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12" style={{ color: 'var(--clr-text-muted)' }}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--clr-border-2)', borderTopColor: 'var(--clr-green)' }} />
          <span className="text-sm">Carregando produtos...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5" style={{ background: 'var(--clr-bg)', minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--clr-text)' }}>Estoque</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>
            {(produtos || []).length} produto{(produtos || []).length !== 1 ? 's' : ''} cadastrado{(produtos || []).length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="Buscar produto..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input w-64"
          />
          <button onClick={abrirNovo} className="btn-action whitespace-nowrap">
            + Novo Produto
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div
        className="rounded-2xl overflow-hidden overflow-x-auto"
        style={{ border: '1px solid var(--clr-border)', background: 'var(--clr-surface)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--clr-border)', background: 'var(--clr-green-pale)' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--clr-text-muted)' }}>Produto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--clr-text-muted)' }}>Categoria</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--clr-text-muted)' }}>Custo</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--clr-text-muted)' }}>Preço</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--clr-text-muted)' }}>Margem</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--clr-text-muted)' }}>Estoque</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--clr-text-muted)' }}>Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(produtos || []).map((p: Produto, i: number) => (
              <tr
                key={p.id}
                style={{
                  borderBottom: '1px solid var(--clr-border)',
                  background: i % 2 === 0 ? 'var(--clr-surface)' : 'var(--clr-bg)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-green-pale)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'var(--clr-surface)' : 'var(--clr-bg)'}
              >
                <td className="px-4 py-3">
                  <div className="font-semibold" style={{ color: 'var(--clr-text)' }}>{p.nome}</div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>
                    {p.codigo_barras ? (
                      <span className="flex items-center gap-1">
                        <IconBarcode />
                        {p.codigo_barras}
                      </span>
                    ) : (
                      <span>Sem código</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--clr-green-lite)', color: 'var(--clr-green)' }}
                  >
                    {p.categoria_nome || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm" style={{ color: 'var(--clr-text-muted)' }}>
                  {formatBRL(p.preco_custo)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-sm" style={{ color: 'var(--clr-text)' }}>
                  {formatBRL(p.preco_venda)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-semibold" style={{ color: 'var(--clr-green-med)' }}>
                  {Number(p.margem_lucro).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm" style={{ minWidth: 100 }}>
                  <span style={{ color: p.estoque_baixo ? 'var(--clr-danger)' : 'var(--clr-text)', fontWeight: p.estoque_baixo ? 700 : 400 }}>
                    {Number(p.estoque_atual).toFixed(p.unidade_medida === 'un' ? 0 : 3)} {p.unidade_medida}
                  </span>
                  <StockBar atual={p.estoque_atual} minimo={p.estoque_minimo} />
                </td>
                <td className="px-4 py-3 text-center">
                  {p.estoque_baixo ? (
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--clr-danger-bg)', color: 'var(--clr-danger)', border: '1px solid #FCA5A5' }}
                    >
                      Baixo
                    </span>
                  ) : (
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--clr-green-lite)', color: 'var(--clr-green)', border: '1px solid var(--clr-border-2)' }}
                    >
                      OK
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => setAjuste({ produto: p, tipo: 'entrada', quantidade: '', observacao: '' })}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                      style={{ color: 'var(--clr-green)', background: 'var(--clr-green-pale)', border: '1px solid var(--clr-border)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-green-lite)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-green-pale)'}
                    >
                      Ajustar
                    </button>
                    <button
                      onClick={() => abrirEditar(p)}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                      style={{ color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#DBEAFE'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#EFF6FF'}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmDel(p)}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                      style={{ color: 'var(--clr-danger)', background: 'var(--clr-danger-bg)', border: '1px solid #FCA5A5' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEE2E2'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-danger-bg)'}
                    >
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(produtos || []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--clr-text-muted)' }}>
                  Nenhum produto encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Cadastrar / Editar Produto */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(25,40,25,0.55)', backdropFilter: 'blur(3px)' }}>
          <div
            className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ border: '1px solid var(--clr-border)' }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--clr-border)', background: 'var(--clr-green-pale)' }}
            >
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--clr-text)' }}>
                  {editando ? `Editar Produto` : 'Novo Produto'}
                </h2>
                {editando && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>{editando.nome}</p>
                )}
              </div>
              <button
                onClick={fecharForm}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--clr-text-muted)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-border)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <IconClose />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="label">Código de Barras</label>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={form.codigo_barras}
                  onChange={e => setForm(f => ({ ...f, codigo_barras: e.target.value }))}
                  className="input font-mono"
                  placeholder="Leia com o scanner ou digite manualmente"
                  autoComplete="off"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--clr-text-muted)' }}>
                  Aponte o leitor para o produto ou digite o código manualmente
                </p>
              </div>

              <div>
                <label className="label">Nome do Produto *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="input"
                  placeholder="Ex: Pão Francês"
                />
              </div>

              <div>
                <label className="label">Categoria *</label>
                <select
                  value={form.categoria_id}
                  onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
                  className="input"
                >
                  <option value="">-- Selecione --</option>
                  {(categorias || []).map((c: Categoria) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Preço de Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.preco_venda}
                    onChange={e => setForm(f => ({ ...f, preco_venda: e.target.value }))}
                    className="input font-mono text-right"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.preco_custo}
                    onChange={e => setForm(f => ({ ...f, preco_custo: e.target.value }))}
                    className="input font-mono text-right"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Unidade</label>
                  <select
                    value={form.unidade_medida}
                    onChange={e => setForm(f => ({ ...f, unidade_medida: e.target.value }))}
                    className="input"
                  >
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                {!editando && (
                  <div>
                    <label className="label">Estoque Inicial</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={form.estoque_atual}
                      onChange={e => setForm(f => ({ ...f, estoque_atual: e.target.value }))}
                      className="input font-mono text-right"
                    />
                  </div>
                )}
                <div>
                  <label className="label">Estoque Mínimo</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={form.estoque_minimo}
                    onChange={e => setForm(f => ({ ...f, estoque_minimo: e.target.value }))}
                    className="input font-mono text-right"
                  />
                </div>
              </div>

              {form.preco_venda && form.preco_custo && parseFloat(form.preco_custo) > 0 && (
                <div
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: 'var(--clr-green-pale)', border: '1px solid var(--clr-border)' }}
                >
                  <span className="text-sm" style={{ color: 'var(--clr-text-muted)' }}>Margem estimada</span>
                  <span className="font-mono font-bold text-sm" style={{ color: 'var(--clr-green)' }}>
                    {(((parseFloat(form.preco_venda) - parseFloat(form.preco_custo)) / parseFloat(form.preco_custo)) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={fecharForm} className="btn-bakery flex-1">Cancelar</button>
              <button
                onClick={salvar}
                disabled={criarM.isLoading || editarM.isLoading}
                className="btn-action flex-1"
              >
                {criarM.isLoading || editarM.isLoading ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ajuste de Estoque */}
      {ajuste && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(25,40,25,0.55)', backdropFilter: 'blur(3px)' }}>
          <div
            className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ border: '1px solid var(--clr-border)' }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--clr-border)', background: 'var(--clr-green-pale)' }}
            >
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--clr-text)' }}>Ajuste de Estoque</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>{ajuste.produto.nome}</p>
              </div>
              <button
                onClick={() => setAjuste(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--clr-text-muted)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-border)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <IconClose />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="label">Tipo de movimentação</label>
                <select
                  value={ajuste.tipo}
                  onChange={e => setAjuste({ ...ajuste, tipo: e.target.value })}
                  className="input"
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                  <option value="ajuste">Ajuste (define saldo final)</option>
                  <option value="perda">Perda</option>
                </select>
              </div>
              <div>
                <label className="label">
                  Quantidade {ajuste.tipo === 'ajuste' ? '(saldo final)' : ''}
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={ajuste.quantidade}
                  onChange={e => setAjuste({ ...ajuste, quantidade: e.target.value })}
                  className="input text-xl font-mono text-center h-14"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Observação</label>
                <input
                  type="text"
                  value={ajuste.observacao}
                  onChange={e => setAjuste({ ...ajuste, observacao: e.target.value })}
                  className="input"
                  placeholder="Motivo do ajuste..."
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setAjuste(null)} className="btn-bakery flex-1">Cancelar</button>
              <button
                onClick={() => ajusteM.mutate({
                  produto_id: ajuste.produto.id,
                  tipo: ajuste.tipo,
                  quantidade: parseFloat(ajuste.quantidade),
                  observacao: ajuste.observacao,
                })}
                disabled={!ajuste.quantidade || ajusteM.isLoading}
                className="btn-action flex-1"
              >
                {ajusteM.isLoading ? 'Salvando...' : 'Confirmar Ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Remoção */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(25,40,25,0.55)', backdropFilter: 'blur(3px)' }}>
          <div
            className="bg-white w-full max-w-sm rounded-2xl p-8 shadow-2xl text-center"
            style={{ border: '1px solid var(--clr-border)' }}
          >
            <div className="flex justify-center mb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--clr-warning-bg)' }}
              >
                <IconWarning />
              </div>
            </div>
            <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--clr-text)' }}>Remover Produto?</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--clr-text-muted)' }}>
              <strong style={{ color: 'var(--clr-text)' }}>{confirmDel.nome}</strong> será desativado e não aparecerá mais no PDV.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="btn-bakery flex-1">Cancelar</button>
              <button
                onClick={() => deletarM.mutate(confirmDel.id)}
                disabled={deletarM.isLoading}
                className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors"
                style={{ background: 'var(--clr-danger)', color: '#fff', border: 'none' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#991B1B'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-danger)'}
              >
                {deletarM.isLoading ? 'Removendo...' : 'Sim, Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
