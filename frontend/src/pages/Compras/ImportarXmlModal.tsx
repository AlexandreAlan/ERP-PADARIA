import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { formatBRL } from '@/utils/currency'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Categoria {
  id: number
  nome: string
}

interface ItemPreview {
  codigo: string
  ean: string | null
  descricao: string
  unidade_nfe: string
  unidade_sugerida: string
  quantidade: number
  valor_unitario: number
  valor_total: number
  produto_id: number | null
  produto_nome: string | null
  encontrado: boolean
}

interface FornecedorPreview {
  cnpj: string
  razao_social: string
  id: number | null
  existe: boolean
}

interface NFePreview {
  chave_acesso: string | null
  numero: string
  serie: string
  fornecedor: FornecedorPreview
  itens: ItemPreview[]
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconX = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18L18 6M6 6l12 12" />
  </svg>
)
const IconUpload = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 16.5V9.75m0 0l-3 3m3-3l3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
  </svg>
)
const IconCheck = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

export default function ImportarXmlModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previa, setPrevia] = useState<NFePreview | null>(null)
  const [notaFiscal, setNotaFiscal] = useState('')
  const [categoriaPorItem, setCategoriaPorItem] = useState<Record<number, string>>({})
  const qc = useQueryClient()

  const { data: categorias = [] } = useQuery<Categoria[]>('categorias', () =>
    api.get('/categorias').then(r => r.data)
  )

  const { mutate: enviarArquivo, isLoading: lendo } = useMutation(
    (arquivo: File) => {
      const form = new FormData()
      form.append('arquivo', arquivo)
      return api.post<NFePreview>('/compras/xml/previa', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    {
      onSuccess: ({ data }) => {
        setPrevia(data)
        setNotaFiscal(data.numero || '')
      },
      onError: (err: any) => { toast.error(err.response?.data?.detail ?? 'Não consegui ler este XML') },
    }
  )

  const { mutate: confirmar, isLoading: confirmando } = useMutation(
    () => {
      if (!previa) return Promise.reject()
      const itensSemCategoria = previa.itens.filter((it, i) => !it.encontrado && !categoriaPorItem[i])
      if (itensSemCategoria.length > 0) {
        toast.error('Escolha a categoria dos itens novos antes de confirmar')
        return Promise.reject()
      }
      return api.post('/compras/xml/confirmar', {
        fornecedor_id: previa.fornecedor.existe ? previa.fornecedor.id : undefined,
        fornecedor_cnpj: previa.fornecedor.existe ? undefined : previa.fornecedor.cnpj,
        fornecedor_nome: previa.fornecedor.existe ? undefined : previa.fornecedor.razao_social,
        nota_fiscal: notaFiscal || null,
        itens: previa.itens.map((it, i) => ({
          descricao: it.descricao,
          ean: it.ean,
          sku: it.codigo,
          quantidade: it.quantidade,
          custo_unit: it.valor_unitario,
          unidade_medida: it.unidade_sugerida,
          produto_id: it.produto_id ?? undefined,
          categoria_id: it.produto_id ? undefined : Number(categoriaPorItem[i]),
        })),
      })
    },
    {
      onSuccess: () => {
        toast.success('Compra lançada a partir da NF-e! Agora é só confirmar o recebimento.')
        qc.invalidateQueries('compras')
        onSuccess()
      },
      onError: (err: any) => {
        if (err) toast.error(err.response?.data?.detail ?? 'Erro ao confirmar a importação')
      },
    }
  )

  const handleArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (arquivo) enviarArquivo(arquivo)
  }

  const itensNovos = previa?.itens.filter(it => !it.encontrado).length ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,30,15,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" style={{ border: '1px solid var(--clr-border)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--clr-border)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--clr-text)' }}>Importar XML da NF-e</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <IconX />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!previa ? (
            <label
              className="flex flex-col items-center justify-center gap-2 py-14 rounded-2xl cursor-pointer transition-colors border-2 border-dashed hover:bg-gray-50"
              style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text-muted)' }}
            >
              <input ref={inputRef} type="file" accept=".xml" className="hidden" onChange={handleArquivo} disabled={lendo} />
              <IconUpload />
              <span className="text-sm font-semibold">{lendo ? 'Lendo o XML...' : 'Clique para escolher o arquivo .xml da nota'}</span>
              <span className="text-xs">É o arquivo que o fornecedor manda junto com a mercadoria — não o PDF/DANFE.</span>
            </label>
          ) : (
            <div className="space-y-5">
              {/* Fornecedor */}
              <div className="rounded-xl p-4" style={{ border: '1px solid var(--clr-border)', background: 'var(--clr-bg)' }}>
                <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--clr-text-muted)' }}>Fornecedor</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--clr-text)' }}>{previa.fornecedor.razao_social}</p>
                <p className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>
                  CNPJ {previa.fornecedor.cnpj} —{' '}
                  {previa.fornecedor.existe ? 'já cadastrado' : 'será cadastrado ao confirmar'}
                </p>
              </div>

              {/* Nota fiscal */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--clr-text-muted)' }}>Número da nota</label>
                <input
                  type="text"
                  value={notaFiscal}
                  onChange={e => setNotaFiscal(e.target.value)}
                  className="w-full sm:w-48 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
                />
              </div>

              {/* Itens */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--clr-text-muted)' }}>
                  Itens da nota ({previa.itens.length}){itensNovos > 0 && ` — ${itensNovos} produto(s) novo(s)`}
                </p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--clr-border)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'var(--clr-bg-subtle, #f9fafb)' }}>
                        <th className="text-left px-3 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>Item</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>Qtd</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>Custo unit.</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previa.itens.map((it, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--clr-border)' }}>
                          <td className="px-3 py-2" style={{ color: 'var(--clr-text)' }}>
                            {it.descricao}
                            {it.ean && <span className="block text-[11px]" style={{ color: 'var(--clr-text-muted)' }}>EAN {it.ean}</span>}
                          </td>
                          <td className="px-3 py-2 text-right" style={{ color: 'var(--clr-text)' }}>{it.quantidade} {it.unidade_sugerida}</td>
                          <td className="px-3 py-2 text-right" style={{ color: 'var(--clr-text)' }}>{formatBRL(it.valor_unitario)}</td>
                          <td className="px-3 py-2">
                            {it.encontrado ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: '#16a34a' }}>
                                <IconCheck /> {it.produto_nome}
                              </span>
                            ) : (
                              <select
                                value={categoriaPorItem[i] ?? ''}
                                onChange={e => setCategoriaPorItem(prev => ({ ...prev, [i]: e.target.value }))}
                                className="w-full border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                                style={{ borderColor: '#f59e0b', color: 'var(--clr-text)' }}
                              >
                                <option value="">Produto novo — categoria...</option>
                                {categorias.map(c => (
                                  <option key={c.id} value={c.id}>{c.nome}</option>
                                ))}
                              </select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {previa && (
          <div className="flex gap-2 justify-end px-6 py-4" style={{ borderTop: '1px solid var(--clr-border)' }}>
            <button
              type="button"
              onClick={() => { setPrevia(null); if (inputRef.current) inputRef.current.value = '' }}
              className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-gray-50"
              style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
            >
              Trocar arquivo
            </button>
            <button
              type="button"
              onClick={() => confirmar()}
              disabled={confirmando}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'var(--clr-primary)' }}
            >
              {confirmando ? 'Lançando...' : 'Confirmar e lançar compra'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
