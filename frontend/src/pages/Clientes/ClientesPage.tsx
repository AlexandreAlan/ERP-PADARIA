import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { formatBRL } from '@/utils/currency'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cliente {
  id: number
  nome: string
  telefone?: string
  email?: string
  cpf?: string
  data_nascimento?: string
  observacao?: string
  pontos_fidelidade: number
  total_compras: number
  total_gasto: number
}

interface HistoricoItem {
  id: number
  uuid: string
  total: number
  desconto_valor: number
  created_at: string
  qtd_itens: number
}

interface ClienteForm {
  nome: string
  telefone: string
  email: string
  cpf: string
  data_nascimento: string
  observacao: string
}

const FORM_VAZIO: ClienteForm = {
  nome: '', telefone: '', email: '', cpf: '', data_nascimento: '', observacao: '',
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconPlus = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)
const IconSearch = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
)
const IconX = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18L18 6M6 6l12 12" />
  </svg>
)
const IconEdit = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
  </svg>
)
const IconStar = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
)
const IconHistory = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IconUsers = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

// ─── Máscaras ─────────────────────────────────────────────────────────────────

function maskCPF(v: string): string {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

function maskTelefone(v: string): string {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4,5})(\d{4})$/, '$1-$2')
}

// ─── Modal de Cadastro/Edição ─────────────────────────────────────────────────

function ClienteModal({
  cliente,
  onClose,
}: {
  cliente?: Cliente
  onClose: () => void
}) {
  const [form, setForm] = useState<ClienteForm>(
    cliente
      ? {
          nome: cliente.nome,
          telefone: cliente.telefone ?? '',
          email: cliente.email ?? '',
          cpf: cliente.cpf ?? '',
          data_nascimento: cliente.data_nascimento ?? '',
          observacao: cliente.observacao ?? '',
        }
      : FORM_VAZIO
  )

  const qc = useQueryClient()

  const { mutate: salvar, isLoading } = useMutation(
    () => cliente
      ? api.put(`/clientes/${cliente.id}`, form)
      : api.post('/clientes', form),
    {
      onSuccess: () => {
        toast.success(cliente ? 'Cliente atualizado!' : 'Cliente cadastrado!')
        qc.invalidateQueries('clientes')
        onClose()
      },
      onError: (err: any) => { toast.error(err.response?.data?.detail ?? 'Erro ao salvar') },
    }
  )

  const set = (k: keyof ClienteForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,30,15,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ border: '1px solid var(--clr-border)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--clr-border)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--clr-text)' }}>
            {cliente ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <IconX />
          </button>
        </div>

        <form onSubmit={e => { e.preventDefault(); salvar() }} className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--clr-text-muted)' }}>Nome *</label>
            <input
              value={form.nome} onChange={set('nome')} required
              placeholder="Nome completo"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--clr-text-muted)' }}>Telefone</label>
              <input
                value={form.telefone}
                onChange={e => setForm(p => ({ ...p, telefone: maskTelefone(e.target.value) }))}
                placeholder="(11) 99999-9999"
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--clr-text-muted)' }}>CPF</label>
              <input
                value={form.cpf}
                onChange={e => setForm(p => ({ ...p, cpf: maskCPF(e.target.value) }))}
                placeholder="000.000.000-00"
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--clr-text-muted)' }}>E-mail</label>
              <input
                type="email" value={form.email} onChange={set('email')}
                placeholder="email@exemplo.com"
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--clr-text-muted)' }}>Nascimento</label>
              <input
                type="date" value={form.data_nascimento} onChange={set('data_nascimento')}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--clr-text-muted)' }}>Observação</label>
            <textarea
              value={form.observacao} onChange={set('observacao')} rows={2}
              placeholder="Preferências, alergias, etc."
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold border hover:bg-gray-50 transition-colors" style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all" style={{ background: 'var(--clr-primary)' }}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal de Histórico ───────────────────────────────────────────────────────

function HistoricoModal({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  const { data: historico = [], isLoading } = useQuery<HistoricoItem[]>(
    ['historico', cliente.id],
    () => api.get(`/clientes/${cliente.id}/historico`).then(r => r.data)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,30,15,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]" style={{ border: '1px solid var(--clr-border)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--clr-border)' }}>
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--clr-text)' }}>Histórico de Compras</h2>
            <p className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>{cliente.nome}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <IconX />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--clr-text-muted)' }}>Carregando...</div>
          ) : historico.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--clr-text-muted)' }}>Nenhuma compra encontrada</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--clr-bg)' }}>
                  <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>Data</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>Itens</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {historico.map(v => (
                  <tr key={v.id} style={{ borderTop: '1px solid var(--clr-border)' }}>
                    <td className="px-4 py-2.5" style={{ color: 'var(--clr-text)' }}>{v.created_at}</td>
                    <td className="px-4 py-2.5 text-right" style={{ color: 'var(--clr-text-muted)' }}>{v.qtd_itens}</td>
                    <td className="px-4 py-2.5 text-right font-semibold" style={{ color: 'var(--clr-primary)' }}>{formatBRL(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-3 flex gap-4 text-sm" style={{ borderTop: '1px solid var(--clr-border)', background: 'var(--clr-bg)' }}>
          <span style={{ color: 'var(--clr-text-muted)' }}>{cliente.total_compras} compras</span>
          <span className="font-semibold" style={{ color: 'var(--clr-primary)' }}>Total: {formatBRL(cliente.total_gasto)}</span>
          <span style={{ color: '#b45309' }}>{Number(cliente.pontos_fidelidade).toFixed(0)} pts</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [busca, setBusca]           = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editando, setEditando]     = useState<Cliente | undefined>()
  const [historico, setHistorico]   = useState<Cliente | undefined>()

  const { data: clientes = [], isLoading } = useQuery<Cliente[]>(
    ['clientes', busca],
    () => api.get('/clientes', { params: busca ? { q: busca } : {} }).then(r => r.data),
    { keepPreviousData: true }
  )

  const totalPontos = clientes.reduce((acc, c) => acc + Number(c.pontos_fidelidade), 0)
  const totalGasto  = clientes.reduce((acc, c) => acc + Number(c.total_gasto), 0)

  function avatarBg(name: string) {
    const COLORS = ['#2D6A4F','#40916C','#1D4ED8','#6D28D9','#0369A1','#B45309']
    let h = 0
    for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
    return COLORS[Math.abs(h) % COLORS.length]
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--clr-primary-light, #dcfce7)', color: 'var(--clr-primary)' }}>
            <IconUsers />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--clr-text)' }}>Clientes</h1>
            <p className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>Cadastro e programa de fidelidade</p>
          </div>
        </div>
        <button
          onClick={() => { setEditando(undefined); setModalOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'var(--clr-primary)' }}
        >
          <IconPlus />
          Novo Cliente
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Clientes cadastrados', value: String(clientes.length), color: 'var(--clr-text)' },
          { label: 'Total em compras', value: formatBRL(totalGasto), color: 'var(--clr-primary)' },
          { label: 'Total de pontos ativos', value: totalPontos.toFixed(0) + ' pts', color: '#b45309' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl p-4" style={{ border: '1px solid var(--clr-border)', background: 'var(--clr-card, white)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--clr-text-muted)' }}>{kpi.label}</p>
            <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <IconSearch />
        </span>
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF ou telefone..."
          className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          style={{ borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--clr-text-muted)' }}>Carregando...</div>
      ) : clientes.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--clr-text-muted)' }}>
          {busca ? 'Nenhum cliente encontrado para essa busca' : 'Nenhum cliente cadastrado ainda'}
        </div>
      ) : (
        <div className="space-y-2">
          {clientes.map(c => (
            <div
              key={c.id}
              className="flex items-center gap-4 px-4 py-3 rounded-2xl"
              style={{ border: '1px solid var(--clr-border)', background: 'var(--clr-card, white)' }}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm text-white"
                style={{ background: avatarBg(c.nome) }}
              >
                {c.nome.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate" style={{ color: 'var(--clr-text)' }}>{c.nome}</div>
                <div className="flex items-center gap-3 mt-0.5">
                  {c.telefone && <span className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>{c.telefone}</span>}
                  {c.cpf && <span className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>{c.cpf}</span>}
                  {c.email && <span className="text-xs truncate" style={{ color: 'var(--clr-text-muted)' }}>{c.email}</span>}
                </div>
              </div>

              {/* Stats */}
              <div className="hidden sm:flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-xs font-semibold" style={{ color: 'var(--clr-text)' }}>{formatBRL(c.total_gasto)}</div>
                  <div className="text-[10px]" style={{ color: 'var(--clr-text-muted)' }}>{c.total_compras} compras</div>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: '#fef3c7', color: '#b45309' }}>
                  <IconStar />
                  {Number(c.pontos_fidelidade).toFixed(0)} pts
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setHistorico(c)}
                  title="Histórico"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <IconHistory />
                </button>
                <button
                  onClick={() => { setEditando(c); setModalOpen(true) }}
                  title="Editar"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <IconEdit />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {modalOpen && (
        <ClienteModal
          cliente={editando}
          onClose={() => { setModalOpen(false); setEditando(undefined) }}
        />
      )}
      {historico && (
        <HistoricoModal
          cliente={historico}
          onClose={() => setHistorico(undefined)}
        />
      )}
    </div>
  )
}
