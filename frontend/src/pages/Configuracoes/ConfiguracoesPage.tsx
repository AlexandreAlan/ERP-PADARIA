import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { useEmpresaStore, EmpresaConfig } from '@/store/empresaStore'

interface Usuario {
  id: number
  uuid: string
  nome: string
  email: string
  perfil: string
  ativo: boolean
}

type Perfil = 'admin' | 'gerente' | 'caixa' | 'estoquista'

const PERFIS: { value: Perfil; label: string }[] = [
  { value: 'admin',      label: 'Administrador'  },
  { value: 'gerente',    label: 'Gerente'        },
  { value: 'caixa',      label: 'Operador Caixa' },
  { value: 'estoquista', label: 'Estoquista'     },
]

const PERFIL_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  admin:      { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  gerente:    { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  caixa:      { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  estoquista: { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
}

// ── Shared UI ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-4">
      {title && <h3 className="font-display font-bold text-base" style={{ color: '#1C140D' }}>{title}</h3>}
      {children}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl" style={{ border: '1px solid #EDE8E0' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3EDE3' }}>
          <h2 className="font-display font-bold text-base" style={{ color: '#1C140D' }}>{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none transition-colors" style={{ color: '#B0A090' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#1C140D')}
            onMouseLeave={e => (e.currentTarget.style.color = '#B0A090')}
          >×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Tab: Empresa ──────────────────────────────────────────────────────────────

function TabEmpresa() {
  const setEmpresa    = useEmpresaStore((s) => s.setEmpresa)
  const cachedEmpresa = useEmpresaStore((s) => s.empresa)
  const queryClient   = useQueryClient()
  const fileRef       = useRef<HTMLInputElement>(null)

  const { data: empresa, isLoading } = useQuery<EmpresaConfig>(
    'empresa',
    () => api.get('/configuracoes/empresa').then((r) => r.data),
    { onSuccess: (data) => setEmpresa(data), initialData: cachedEmpresa ?? undefined }
  )

  const [form, setForm] = useState({
    nome: '', cnpj: '', telefone: '', email: '',
    endereco: '', cidade: '', mensagem_rodape: '',
  })

  useEffect(() => {
    if (empresa) setForm({
      nome: empresa.nome ?? '', cnpj: empresa.cnpj ?? '',
      telefone: empresa.telefone ?? '', email: empresa.email ?? '',
      endereco: empresa.endereco ?? '', cidade: empresa.cidade ?? '',
      mensagem_rodape: empresa.mensagem_rodape ?? '',
    })
  }, [empresa])

  const salvarM = useMutation(
    (payload: typeof form) => api.put('/configuracoes/empresa', payload).then((r) => r.data),
    {
      onSuccess: (data: EmpresaConfig) => {
        setEmpresa(data); queryClient.setQueryData('empresa', data)
        toast.success('Configurações salvas!')
      },
      onError: (e: any) => { toast.error(e.response?.data?.detail || 'Erro ao salvar') },
    }
  )

  const logoM = useMutation(
    (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return api.post('/configuracoes/empresa/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data)
    },
    {
      onSuccess: (data: EmpresaConfig) => {
        setEmpresa(data); queryClient.setQueryData('empresa', data)
        toast.success('Logo atualizado!')
      },
      onError: (e: any) => { toast.error(e.response?.data?.detail || 'Erro ao enviar logo') },
    }
  )

  if (isLoading) return <p className="text-sm" style={{ color: '#B0A090' }}>Carregando...</p>

  return (
    <div className="space-y-5 max-w-2xl">
      <SectionCard title="Logo da empresa">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
            style={{ background: '#F3EDE3', border: '1.5px solid #E8DDD0' }}>
            {empresa?.logo_url
              ? <img src={empresa.logo_url} alt="Logo" className="w-full h-full object-cover" />
              : <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#B0A090" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5C3 7.015 5.015 5 7.5 5S12 7.015 12 9.5c0-.5 0-4.5 4.5-4.5S21 7.015 21 9.5c0 4.5-4.5 8-9 11-4.5-3-9-6.5-9-11z"/></svg>}
          </div>
          <div className="space-y-2">
            <button onClick={() => fileRef.current?.click()} disabled={logoM.isLoading} className="btn-secondary text-sm disabled:opacity-50">
              {logoM.isLoading ? 'Enviando...' : 'Alterar logo'}
            </button>
            <p className="text-xs" style={{ color: '#B0A090' }}>PNG, JPG ou WEBP — máx. 5 MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) logoM.mutate(f); e.target.value = '' }} />
        </div>
      </SectionCard>

      <SectionCard title="Dados da empresa">
        <Field label="Nome da empresa *">
          <input className="input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Padaria Exemplo" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="CNPJ">
            <input className="input" value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
          </Field>
          <Field label="Telefone">
            <input className="input" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-9999" />
          </Field>
        </div>
        <Field label="E-mail">
          <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contato@padaria.com" />
        </Field>
        <Field label="Endereço">
          <input className="input" value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} placeholder="Rua das Flores, 123" />
        </Field>
        <Field label="Cidade / Estado">
          <input className="input" value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} placeholder="São Paulo – SP" />
        </Field>
        <Field label="Mensagem de rodapé (cupom)">
          <input className="input" value={form.mensagem_rodape} onChange={e => setForm({ ...form, mensagem_rodape: e.target.value })} placeholder="Obrigado pela preferência!" />
        </Field>
        <div className="pt-1">
          <button onClick={() => salvarM.mutate(form)} disabled={salvarM.isLoading || !form.nome.trim()} className="btn-primary disabled:opacity-50">
            {salvarM.isLoading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </SectionCard>
    </div>
  )
}

// ── Modal usuário ─────────────────────────────────────────────────────────────

interface UsuarioFormData { nome: string; email: string; senha: string; perfil: Perfil }

function UsuarioModal({ usuario, onClose, onSaved }: { usuario: Usuario | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<UsuarioFormData>({
    nome: usuario?.nome ?? '', email: usuario?.email ?? '',
    senha: '', perfil: (usuario?.perfil as Perfil) ?? 'caixa',
  })
  const isNew = usuario === null

  const mutation = useMutation(
    (data: UsuarioFormData) =>
      isNew
        ? api.post('/usuarios', data).then((r) => r.data)
        : api.put(`/usuarios/${usuario!.id}`, { nome: data.nome, email: data.email, perfil: data.perfil, ...(data.senha ? { nova_senha: data.senha } : {}) }).then((r) => r.data),
    {
      onSuccess: () => { toast.success(isNew ? 'Usuário criado!' : 'Usuário atualizado!'); onSaved(); onClose() },
      onError: (e: any) => { toast.error(e.response?.data?.detail || 'Erro ao salvar usuário') },
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim() || !form.email.trim()) return
    if (isNew && !form.senha.trim()) { toast.error('Senha obrigatória'); return }
    mutation.mutate(form)
  }

  return (
    <Modal title={isNew ? 'Novo usuário' : 'Editar usuário'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome completo *">
          <input className="input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="João da Silva" required />
        </Field>
        <Field label="E-mail *">
          <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="joao@padaria.com" required />
        </Field>
        <Field label={isNew ? 'Senha *' : 'Nova senha (deixe em branco para manter)'}>
          <input className="input" type="password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} placeholder={isNew ? 'Mínimo 6 caracteres' : '••••••••'} required={isNew} />
        </Field>
        <Field label="Perfil *">
          <select className="input" value={form.perfil} onChange={e => setForm({ ...form, perfil: e.target.value as Perfil })}>
            {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={mutation.isLoading} className="btn-primary flex-1 disabled:opacity-50">
            {mutation.isLoading ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        </div>
      </form>
    </Modal>
  )
}

function ResetSenhaModal({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const [senha, setSenha]     = useState('')
  const [confirm, setConfirm] = useState('')

  const mutation = useMutation(
    () => api.put(`/usuarios/${usuario.id}`, { nova_senha: senha }).then((r) => r.data),
    {
      onSuccess: () => { toast.success('Senha redefinida!'); onClose() },
      onError: (e: any) => { toast.error(e.response?.data?.detail || 'Erro ao redefinir senha') },
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (senha.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return }
    if (senha !== confirm) { toast.error('As senhas não coincidem'); return }
    mutation.mutate()
  }

  return (
    <Modal title={`Redefinir senha — ${usuario.nome}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nova senha *">
          <input className="input" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" required />
        </Field>
        <Field label="Confirmar senha *">
          <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a senha" required />
        </Field>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={mutation.isLoading} className="btn-primary flex-1 disabled:opacity-50">
            {mutation.isLoading ? 'Salvando...' : 'Redefinir senha'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Tab: Usuários ─────────────────────────────────────────────────────────────

function TabUsuarios() {
  const queryClient = useQueryClient()
  const [modalCriar, setModalCriar]       = useState(false)
  const [editando, setEditando]           = useState<Usuario | null>(null)
  const [resetSenha, setResetSenha]       = useState<Usuario | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Usuario | null>(null)

  const { data: usuarios, isLoading } = useQuery<Usuario[]>(
    'usuarios', () => api.get('/usuarios').then((r) => r.data), { staleTime: 10_000 }
  )

  const toggleAtivoM = useMutation(
    ({ id, ativo }: { id: number; ativo: boolean }) => api.put(`/usuarios/${id}`, { ativo }).then((r) => r.data),
    { onSuccess: () => { queryClient.invalidateQueries('usuarios'); toast.success('Status atualizado!') },
      onError: (e: any) => { toast.error(e.response?.data?.detail || 'Erro') } }
  )

  const deleteM = useMutation(
    (id: number) => api.delete(`/usuarios/${id}`),
    { onSuccess: () => { queryClient.invalidateQueries('usuarios'); setConfirmDelete(null); toast.success('Usuário removido!') },
      onError: (e: any) => { toast.error(e.response?.data?.detail || 'Erro') } }
  )

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: '#8A7A6A' }}>{usuarios?.length ?? 0} usuário(s)</p>
        <button onClick={() => setModalCriar(true)} className="btn-primary">
          <span className="text-base leading-none">+</span> Novo usuário
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm" style={{ color: '#B0A090' }}>Carregando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #F3EDE3', background: '#FAFAF7' }}>
                {['Nome', 'E-mail', 'Perfil', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#B0A090' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios?.map((u, i) => {
                const badge = PERFIL_BADGE[u.perfil] ?? { bg: '#F3EDE3', color: '#8A7A6A', border: '#E8DDD0' }
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F3EDE3', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAF7' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: '#1C140D' }}>{u.nome}</td>
                    <td className="px-4 py-3" style={{ color: '#8A7A6A' }}>{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                        {PERFIS.find(p => p.value === u.perfil)?.label ?? u.perfil}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAtivoM.mutate({ id: u.id, ativo: !u.ativo })}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all"
                        style={u.ativo
                          ? { background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }
                          : { background: '#F3EDE3', color: '#8A7A6A', border: '1px solid #E8DDD0' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: u.ativo ? '#16A34A' : '#D4C9B8' }} />
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditando(u)} title="Editar"
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#B0A090' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#1D4ED8' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#B0A090' }}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => setResetSenha(u)} title="Redefinir senha"
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#B0A090' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FFFBEB'; e.currentTarget.style.color = '#B45309' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#B0A090' }}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        </button>
                        <button onClick={() => setConfirmDelete(u)} title="Remover"
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#B0A090' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#B91C1C' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#B0A090' }}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalCriar  && <UsuarioModal usuario={null} onClose={() => setModalCriar(false)} onSaved={() => queryClient.invalidateQueries('usuarios')} />}
      {editando    && <UsuarioModal usuario={editando} onClose={() => setEditando(null)} onSaved={() => queryClient.invalidateQueries('usuarios')} />}
      {resetSenha  && <ResetSenhaModal usuario={resetSenha} onClose={() => setResetSenha(null)} />}
      {confirmDelete && (
        <Modal title="Confirmar exclusão" onClose={() => setConfirmDelete(null)}>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: '#4E3F34' }}>
              Remover o usuário <span className="font-semibold" style={{ color: '#1C140D' }}>{confirmDelete.nome}</span>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => deleteM.mutate(confirmDelete.id)} disabled={deleteM.isLoading} className="btn-danger flex-1 disabled:opacity-50">
                {deleteM.isLoading ? 'Removendo...' : 'Sim, remover'}
              </button>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Tab: SMTP ─────────────────────────────────────────────────────────────────

interface SmtpConfig {
  smtp_host: string | null; smtp_port: number | null; smtp_user: string | null
  smtp_from: string | null; smtp_tls: boolean; smtp_ssl: boolean; smtp_configurado: boolean
}

function TabSmtp() {
  const [form, setForm] = useState({
    smtp_host: '', smtp_port: '587', smtp_user: '', smtp_senha: '',
    smtp_from: '', smtp_tls: true, smtp_ssl: false,
  })
  const [testando, setTestando] = useState(false)
  const queryClient = useQueryClient()

  const { data: smtp, isLoading } = useQuery<SmtpConfig>(
    'smtp', () => api.get('/configuracoes/smtp').then((r) => r.data),
    { onSuccess: (data) => setForm(prev => ({ ...prev, smtp_host: data.smtp_host ?? '', smtp_port: String(data.smtp_port ?? 587), smtp_user: data.smtp_user ?? '', smtp_from: data.smtp_from ?? '', smtp_tls: data.smtp_tls, smtp_ssl: data.smtp_ssl })) }
  )

  const salvarM = useMutation(
    (payload: typeof form) => api.put('/configuracoes/smtp', { ...payload, smtp_port: Number(payload.smtp_port) || 587, smtp_senha: payload.smtp_senha || undefined }).then((r) => r.data),
    { onSuccess: () => { queryClient.invalidateQueries('smtp'); toast.success('SMTP salvo!'); setForm(p => ({ ...p, smtp_senha: '' })) },
      onError: (e: any) => { toast.error(e.response?.data?.detail || 'Erro ao salvar') } }
  )

  const testar = async () => {
    setTestando(true)
    try { await api.post('/configuracoes/smtp/testar'); toast.success('Conexão SMTP OK!') }
    catch (e: any) { toast.error(e.response?.data?.detail || 'Falha na conexão') }
    finally { setTestando(false) }
  }

  const handleTlsSsl = (field: 'smtp_tls' | 'smtp_ssl', value: boolean) => {
    if (field === 'smtp_ssl' && value) setForm({ ...form, smtp_ssl: true, smtp_tls: false, smtp_port: '465' })
    else if (field === 'smtp_tls' && value) setForm({ ...form, smtp_tls: true, smtp_ssl: false, smtp_port: '587' })
    else setForm({ ...form, [field]: value })
  }

  if (isLoading) return <p className="text-sm" style={{ color: '#B0A090' }}>Carregando...</p>

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={smtp?.smtp_configurado
            ? { background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }
            : { background: '#F3EDE3', color: '#8A7A6A', border: '1px solid #E8DDD0' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: smtp?.smtp_configurado ? '#16A34A' : '#D4C9B8' }} />
          {smtp?.smtp_configurado ? 'SMTP configurado' : 'SMTP não configurado'}
        </span>
        {smtp?.smtp_configurado && (
          <button onClick={testar} disabled={testando} className="btn-secondary text-xs disabled:opacity-50">
            {testando ? 'Testando...' : 'Testar conexão'}
          </button>
        )}
      </div>

      <SectionCard title="Servidor de saída (SMTP)">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field label="Servidor SMTP (host)">
              <input className="input" value={form.smtp_host} onChange={e => setForm({ ...form, smtp_host: e.target.value })} placeholder="smtp.gmail.com" />
            </Field>
          </div>
          <Field label="Porta">
            <input className="input" type="number" value={form.smtp_port} onChange={e => setForm({ ...form, smtp_port: e.target.value })} placeholder="587" />
          </Field>
        </div>

        <div className="flex gap-5">
          {[
            { field: 'smtp_tls' as const, label: 'STARTTLS (porta 587)' },
            { field: 'smtp_ssl' as const, label: 'SSL direto (porta 465)' },
          ].map(opt => (
            <label key={opt.field} className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form[opt.field]} onChange={e => handleTlsSsl(opt.field, e.target.checked)}
                className="w-4 h-4 rounded accent-amber-600" />
              <span className="text-sm" style={{ color: '#4E3F34' }}>{opt.label}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Usuário (e-mail de login)">
            <input className="input" value={form.smtp_user} onChange={e => setForm({ ...form, smtp_user: e.target.value })} placeholder="sistema@padaria.com" />
          </Field>
          <Field label={smtp?.smtp_configurado ? 'Senha (vazio = manter)' : 'Senha'}>
            <input className="input" type="password" value={form.smtp_senha} onChange={e => setForm({ ...form, smtp_senha: e.target.value })} placeholder={smtp?.smtp_configurado ? '••••••••' : 'Senha do e-mail'} />
          </Field>
        </div>

        <Field label="Remetente (From)">
          <input className="input" value={form.smtp_from} onChange={e => setForm({ ...form, smtp_from: e.target.value })} placeholder="ERP Padaria <sistema@padaria.com>" />
        </Field>

        <div className="rounded-xl p-3 text-xs space-y-1" style={{ background: '#F3EDE3', border: '1px solid #E8DDD0', color: '#8A7A6A' }}>
          <p><span className="font-semibold" style={{ color: '#4E3F34' }}>Gmail:</span> smtp.gmail.com:587 — habilite "App Passwords" na conta Google.</p>
          <p><span className="font-semibold" style={{ color: '#4E3F34' }}>Outlook/365:</span> smtp.office365.com:587 (STARTTLS).</p>
          <p><span className="font-semibold" style={{ color: '#4E3F34' }}>Yahoo:</span> smtp.mail.yahoo.com:587 ou 465 (SSL).</p>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={() => salvarM.mutate(form)} disabled={salvarM.isLoading} className="btn-primary disabled:opacity-50">
            {salvarM.isLoading ? 'Salvando...' : 'Salvar configurações'}
          </button>
          {smtp?.smtp_configurado && (
            <button onClick={testar} disabled={testando} className="btn-secondary disabled:opacity-50">
              {testando ? 'Testando...' : 'Testar conexão'}
            </button>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'empresa',  label: 'Empresa'    },
  { id: 'usuarios', label: 'Usuários'   },
  { id: 'smtp',     label: 'E-mail / SMTP' },
]

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<'empresa' | 'usuarios' | 'smtp'>('empresa')

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold" style={{ color: '#1C140D' }}>Configurações</h1>
        <p className="text-sm mt-1" style={{ color: '#8A7A6A' }}>Gerencie os dados da empresa e os usuários do sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#FFFFFF', border: '1px solid #E8DDD0' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
            style={tab === t.id
              ? { background: 'var(--clr-green)', color: '#fff', boxShadow: '0 2px 8px rgba(45,106,79,0.25)' }
              : { color: 'var(--clr-text-muted)' }}
            onMouseEnter={e => { if (tab !== t.id) (e.currentTarget as HTMLElement).style.background = 'var(--clr-green-pale)' }}
            onMouseLeave={e => { if (tab !== t.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'empresa'  && <TabEmpresa  />}
      {tab === 'usuarios' && <TabUsuarios />}
      {tab === 'smtp'     && <TabSmtp     />}
    </div>
  )
}
