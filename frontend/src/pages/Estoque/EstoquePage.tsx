import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { formatBRL } from '@/utils/currency'

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function EstoquePage() {
  const [busca, setBusca]           = useState('')
  const [ajuste, setAjuste]         = useState<any>(null)
  const [showForm, setShowForm]     = useState(false)
  const [editando, setEditando]     = useState<Produto | null>(null)
  const [form, setForm]             = useState({ ...emptyForm })
  const [confirmDel, setConfirmDel] = useState<Produto | null>(null)
  const barcodeInputRef             = useRef<HTMLInputElement>(null)
  const queryClient                 = useQueryClient()

  // ── Queries ──────────────────────────────────────────────────────────────────

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

  // ── Mutations ────────────────────────────────────────────────────────────────

  const criarM = useMutation(
    (payload: any) => api.post('/produtos', payload).then(r => r.data),
    {
      onSuccess: () => {
        toast.success('Produto cadastrado!')
        queryClient.invalidateQueries('produtos')
        fecharForm()
      },
      onError: (e: any) => toast.error(e.response?.data?.detail || 'Erro ao cadastrar'),
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
      onError: (e: any) => toast.error(e.response?.data?.detail || 'Erro ao atualizar'),
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
      onError: (e: any) => toast.error(e.response?.data?.detail || 'Erro ao remover'),
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
      onError: (e: any) => toast.error(e.response?.data?.detail || 'Erro no ajuste'),
    }
  )

  // ── Helpers ──────────────────────────────────────────────────────────────────

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

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoading) return <div className="p-6 text-gray-400">Carregando...</div>

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Estoque</h1>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="Buscar produto..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input w-64"
          />
          <button onClick={abrirNovo} className="btn-primary whitespace-nowrap">
            + Novo Produto
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
              <th className="text-left px-4 py-3">Produto</th>
              <th className="text-left px-4 py-3">Categoria</th>
              <th className="text-right px-4 py-3">Custo</th>
              <th className="text-right px-4 py-3">Preço</th>
              <th className="text-right px-4 py-3">Margem</th>
              <th className="text-right px-4 py-3">Estoque</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(produtos || []).map((p: Produto, i: number) => (
              <tr
                key={p.id}
                className={`border-b border-gray-800 hover:bg-gray-800 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-900/30'}`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{p.nome}</div>
                  <div className="text-xs text-gray-500">{p.codigo_barras || 'S/Código'}</div>
                </td>
                <td className="px-4 py-3 text-gray-400">{p.categoria_nome || '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-300">{formatBRL(p.preco_custo)}</td>
                <td className="px-4 py-3 text-right font-mono text-white font-bold">{formatBRL(p.preco_venda)}</td>
                <td className="px-4 py-3 text-right font-mono text-green-400">{Number(p.margem_lucro).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right font-mono">
                  <span className={p.estoque_baixo ? 'text-red-400 font-bold' : 'text-gray-300'}>
                    {Number(p.estoque_atual).toFixed(p.unidade_medida === 'un' ? 0 : 3)} {p.unidade_medida}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {p.estoque_baixo ? (
                    <span className="bg-red-900/50 text-red-300 text-xs px-2 py-0.5 rounded-full border border-red-700">Baixo</span>
                  ) : (
                    <span className="bg-green-900/50 text-green-300 text-xs px-2 py-0.5 rounded-full border border-green-700">OK</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setAjuste({ produto: p, tipo: 'entrada', quantidade: '', observacao: '' })}
                      className="text-xs text-brand-400 hover:text-brand-300"
                    >
                      Ajustar
                    </button>
                    <button
                      onClick={() => abrirEditar(p)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmDel(p)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(produtos || []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Nenhum produto encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Cadastrar / Editar Produto */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">
                {editando ? `Editar — ${editando.nome}` : 'Novo Produto'}
              </h2>
              <button onClick={fecharForm} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="space-y-4">
              {/* Código de barras — funciona com scanner KNUP e teclado */}
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
                <p className="text-xs text-gray-500 mt-1">
                  Aponte o leitor KNUP para o produto ou digite o codigo manualmente
                </p>
              </div>

              {/* Nome */}
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

              {/* Categoria */}
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

              {/* Preços */}
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

              {/* Unidade e estoques */}
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

              {/* Margem calculada ao vivo */}
              {form.preco_venda && form.preco_custo && parseFloat(form.preco_custo) > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-3 text-sm">
                  <span className="text-gray-400">Margem estimada: </span>
                  <span className="text-green-400 font-bold font-mono">
                    {(((parseFloat(form.preco_venda) - parseFloat(form.preco_custo)) / parseFloat(form.preco_custo)) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={fecharForm} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={salvar}
                disabled={criarM.isLoading || editarM.isLoading}
                className="btn-primary flex-1"
              >
                {criarM.isLoading || editarM.isLoading ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ajuste de Estoque */}
      {ajuste && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-lg font-bold text-white mb-4">
              Ajustar Estoque — {ajuste.produto.nome}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Tipo</label>
                <select
                  value={ajuste.tipo}
                  onChange={e => setAjuste({ ...ajuste, tipo: e.target.value })}
                  className="input"
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                  <option value="ajuste">Ajuste (define saldo)</option>
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
                  className="input text-xl font-mono text-center"
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
            <div className="flex gap-3 mt-6">
              <button onClick={() => setAjuste(null)} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={() => ajusteM.mutate({
                  produto_id: ajuste.produto.id,
                  tipo: ajuste.tipo,
                  quantidade: parseFloat(ajuste.quantidade),
                  observacao: ajuste.observacao,
                })}
                disabled={!ajuste.quantidade || ajusteM.isLoading}
                className="btn-primary flex-1"
              >
                {ajusteM.isLoading ? 'Salvando...' : 'Salvar Ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Remoção */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm border border-gray-700">
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-lg font-bold text-white mb-2">Remover Produto?</h2>
              <p className="text-gray-400 text-sm mb-6">
                <strong className="text-white">{confirmDel.nome}</strong> será desativado e não aparecerá mais no PDV.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={() => deletarM.mutate(confirmDel.id)}
                disabled={deletarM.isLoading}
                className="btn-danger flex-1"
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
