import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'

interface DetalheLinha {
  linha: number
  nome: string
  acao: 'criado' | 'atualizado' | 'erro'
  motivo?: string | null
}

interface ResumoImportacao {
  total_linhas: number
  criados: number
  atualizados: number
  com_erro: number
  aplicado: boolean
  detalhes: DetalheLinha[]
}

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

export default function ImportarExcelModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [resumo, setResumo] = useState<ResumoImportacao | null>(null)
  const qc = useQueryClient()

  const enviar = (confirmar: boolean) => {
    if (!arquivo) return
    const form = new FormData()
    form.append('arquivo', arquivo)
    return api.post<ResumoImportacao>(`/produtos/excel/importar?confirmar=${confirmar}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  const { mutate: gerarPrevia, isLoading: lendo } = useMutation(
    (f: File) => { setArquivo(f); return enviar(false)! },
    {
      onSuccess: ({ data }) => setResumo(data),
      onError: (err: any) => { toast.error(err.response?.data?.detail ?? 'Não consegui ler esta planilha') },
    }
  )

  const { mutate: confirmarImportacao, isLoading: aplicando } = useMutation(
    () => enviar(true)!,
    {
      onSuccess: ({ data }) => {
        toast.success(`Importado: ${data.criados} novo(s), ${data.atualizados} atualizado(s).`)
        qc.invalidateQueries('produtos')
        onSuccess()
      },
      onError: (err: any) => { toast.error(err.response?.data?.detail ?? 'Erro ao aplicar a importação') },
    }
  )

  const handleArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) gerarPrevia(f)
  }

  const erros = resumo?.detalhes.filter(d => d.acao === 'erro') ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,30,15,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" style={{ border: '1px solid var(--clr-border)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--clr-border)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--clr-text)' }}>Importar Excel de produtos</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <IconX />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!resumo ? (
            <label
              className="flex flex-col items-center justify-center gap-2 py-14 rounded-2xl cursor-pointer transition-colors border-2 border-dashed hover:bg-gray-50"
              style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text-muted)' }}
            >
              <input ref={inputRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={handleArquivo} disabled={lendo} />
              <IconUpload />
              <span className="text-sm font-semibold">{lendo ? 'Conferindo...' : 'Clique para escolher a planilha .xlsx'}</span>
              <span className="text-xs">Use o mesmo modelo do "Exportar Excel" — casa por ID, código de barras ou SKU.</span>
            </label>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ border: '1px solid var(--clr-border)' }}>
                  <p className="text-lg font-bold" style={{ color: '#16a34a' }}>{resumo.criados}</p>
                  <p className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>Produtos novos</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ border: '1px solid var(--clr-border)' }}>
                  <p className="text-lg font-bold" style={{ color: 'var(--clr-primary)' }}>{resumo.atualizados}</p>
                  <p className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>Serão atualizados</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ border: '1px solid var(--clr-border)' }}>
                  <p className="text-lg font-bold" style={{ color: resumo.com_erro > 0 ? '#dc2626' : 'var(--clr-text-muted)' }}>{resumo.com_erro}</p>
                  <p className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>Com erro (ignoradas)</p>
                </div>
              </div>

              <p className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>
                A quantidade em estoque não é alterada por aqui — isso continua só por compra ou ajuste de estoque.
              </p>

              {erros.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #fecaca' }}>
                  <div className="px-3 py-2 text-xs font-bold" style={{ background: '#fef2f2', color: '#dc2626' }}>
                    Linhas com erro (não serão aplicadas)
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {erros.map((d, i) => (
                      <div key={i} className="px-3 py-2 text-xs" style={{ borderTop: '1px solid #fecaca' }}>
                        <span className="font-semibold">Linha {d.linha} — {d.nome}:</span> {d.motivo}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {resumo && (
          <div className="flex gap-2 justify-end px-6 py-4" style={{ borderTop: '1px solid var(--clr-border)' }}>
            <button
              type="button"
              onClick={() => { setResumo(null); setArquivo(null); if (inputRef.current) inputRef.current.value = '' }}
              className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-gray-50"
              style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
            >
              Trocar arquivo
            </button>
            <button
              type="button"
              onClick={() => confirmarImportacao()}
              disabled={aplicando || (resumo.criados === 0 && resumo.atualizados === 0)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'var(--clr-primary)' }}
            >
              {aplicando ? 'Aplicando...' : `Aplicar (${resumo.criados + resumo.atualizados} linha${resumo.criados + resumo.atualizados !== 1 ? 's' : ''})`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
