import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { useEmpresaStore, EmpresaConfig } from '@/store/empresaStore'

// ── Types ─────────────────────────────────────────────────────────────────────

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
  { value: 'admin',       label: 'Administrador' },
  { value: 'gerente',     label: 'Gerente'       },
  { value: 'caixa',       label: 'Operador Caixa'},
  { value: 'estoquista',  label: 'Estoquista'    },
]

const PERFIL_COLORS: Record<string, string> = {
  admin:      'bg-red-500/20 text-red-300 border border-red-500/30',
  gerente:    'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  caixa:      'bg-green-500/20 text-green-300 border border-green-500/30',
  estoquista: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
}

// ── Shared UI components ───────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm text-gray-400">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors'

const selectCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors'

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Tab: Empresa ──────────────────────────────────────────────────────────────

function TabEmpresa() {
  const setEmpresa = useEmpresaStore((s) => s.setEmpresa)
  const cachedEmpresa = useEmpresaStore((s) => s.empresa)
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: empresa, isLoading } = useQuery<EmpresaConfig>(
    'empresa',
    () => api.get('/configuracoes/empresa').then((r) => r.data),
    {
      onSuccess: (data) => setEmpresa(data),
      initialData: cachedEmpresa ?? undefined,
    }
  )

  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    mensagem_rodape: '',
  })

  useEffect(() => {
    if (empresa) {
      setForm({
        nome:             empresa.nome            ?? '',
        cnpj:             empresa.cnpj            ?? '',
        telefone:         empresa.telefone        ?? '',
        email:            empresa.email           ?? '',
        endereco:         empresa.endereco        ?? '',
        cidade:           empresa.cidade          ?? '',
        mensagem_rodape:  empresa.mensagem_rodape ?? '',
      })
    }
  }, [empresa])

  const salvarM = useMutation(
    (payload: typeof form) => api.put('/configuracoes/empresa', payload).then((r) => r.data),
    {
      onSuccess: (data: EmpresaConfig) => {
        setEmpresa(data)
        queryClient.setQueryData('empresa', data)
        toast.success('Configurações salvas!')
      },
      onError: (e: any) =>
        toast.error(e.response?.data?.detail || 'Erro ao salvar'),
    }
  )

  const logoM = useMutation(
    (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return api
        .post('/configuracoes/empresa/logo', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    {
      onSuccess: (data: EmpresaConfig) => {
        setEmpresa(data)
        queryClient.setQueryData('empresa', data)
        toast.success('Logo atualizado!')
      },
      onError: (e: any) =>
        toast.error(e.response?.data?.detail || 'Erro ao enviar logo'),
    }
  )

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) logoM.mutate(file)
    e.target.value = ''
  }

  if (isLoading) return <p className="text-gray-400 text-sm">Carregando...</p>

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Logo */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Logo da empresa</h3>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
            {empresa?.logo_url ? (
              <img
                src={empresa.logo_url}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl">🥖</span>
            )}
          </div>
          <div className="space-y-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={logoM.isLoading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {logoM.isLoading ? 'Enviando...' : 'Alterar logo'}
            </button>
            <p className="text-xs text-gray-500">PNG, JPG ou WEBP — máx. 5 MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>

      {/* Dados da empresa */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300">Dados da empresa</h3>

        <Field label="Nome da empresa *">
          <input
            className={inputCls}
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Padaria Exemplo"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="CNPJ">
            <input
              className={inputCls}
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              placeholder="00.000.000/0001-00"
            />
          </Field>
          <Field label="Telefone">
            <input
              className={inputCls}
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
          </Field>
        </div>

        <Field label="E-mail">
          <input
            className={inputCls}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="contato@padaria.com.br"
          />
        </Field>

        <Field label="Endereço">
          <input
            className={inputCls}
            value={form.endereco}
            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            placeholder="Rua das Flores, 123"
          />
        </Field>

        <Field label="Cidade / Estado">
          <input
            className={inputCls}
            value={form.cidade}
            onChange={(e) => setForm({ ...form, cidade: e.target.value })}
            placeholder="São Paulo – SP"
          />
        </Field>

        <Field label="Mensagem de rodapé (cupom)">
          <input
            className={inputCls}
            value={form.mensagem_rodape}
            onChange={(e) => setForm({ ...form, mensagem_rodape: e.target.value })}
            placeholder="Obrigado pela preferência!"
          />
        </Field>

        <div className="pt-2">
          <button
            onClick={() => salvarM.mutate(form)}
            disabled={salvarM.isLoading || !form.nome.trim()}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {salvarM.isLoading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: criar / editar usuário ─────────────────────────────────────────────

interface UsuarioFormData {
  nome: string
  email: string
  senha: string
  perfil: Perfil
}

function UsuarioModal({
  usuario,
  onClose,
  onSaved,
}: {
  usuario: Usuario | null // null = criando novo
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<UsuarioFormData>({
    nome:   usuario?.nome  ?? '',
    email:  usuario?.email ?? '',
    senha:  '',
    perfil: (usuario?.perfil as Perfil) ?? 'caixa',
  })

  const isNew = usuario === null

  const mutation = useMutation(
    (data: UsuarioFormData) =>
      isNew
        ? api.post('/usuarios', data).then((r) => r.data)
        : api
            .put(`/usuarios/${usuario!.id}`, {
              nome:  data.nome,
              email: data.email,
              perfil: data.perfil,
              ...(data.senha ? { nova_senha: data.senha } : {}),
            })
            .then((r) => r.data),
    {
      onSuccess: () => {
        toast.success(isNew ? 'Usuário criado!' : 'Usuário atualizado!')
        onSaved()
        onClose()
      },
      onError: (e: any) =>
        toast.error(e.response?.data?.detail || 'Erro ao salvar usuário'),
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim() || !form.email.trim()) return
    if (isNew && !form.senha.trim()) {
      toast.error('Senha obrigatória para novo usuário')
      return
    }
    mutation.mutate(form)
  }

  return (
    <Modal title={isNew ? 'Novo usuário' : 'Editar usuário'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome completo *">
          <input
            className={inputCls}
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="João da Silva"
            required
          />
        </Field>

        <Field label="E-mail *">
          <input
            className={inputCls}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="joao@padaria.com"
            required
          />
        </Field>

        <Field label={isNew ? 'Senha *' : 'Nova senha (deixe em branco para manter)'}>
          <input
            className={inputCls}
            type="password"
            value={form.senha}
            onChange={(e) => setForm({ ...form, senha: e.target.value })}
            placeholder={isNew ? 'Mínimo 6 caracteres' : '••••••••'}
            required={isNew}
          />
        </Field>

        <Field label="Perfil *">
          <select
            className={selectCls}
            value={form.perfil}
            onChange={(e) => setForm({ ...form, perfil: e.target.value as Perfil })}
          >
            {PERFIS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isLoading}
            className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {mutation.isLoading ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Modal: redefinir senha ────────────────────────────────────────────────────

function ResetSenhaModal({
  usuario,
  onClose,
}: {
  usuario: Usuario
  onClose: () => void
}) {
  const [senha, setSenha] = useState('')
  const [confirm, setConfirm] = useState('')

  const mutation = useMutation(
    () =>
      api
        .put(`/usuarios/${usuario.id}`, { nova_senha: senha })
        .then((r) => r.data),
    {
      onSuccess: () => {
        toast.success('Senha redefinida com sucesso!')
        onClose()
      },
      onError: (e: any) =>
        toast.error(e.response?.data?.detail || 'Erro ao redefinir senha'),
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (senha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (senha !== confirm) {
      toast.error('As senhas não coincidem')
      return
    }
    mutation.mutate()
  }

  return (
    <Modal title={`Redefinir senha — ${usuario.nome}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nova senha *">
          <input
            className={inputCls}
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
          />
        </Field>
        <Field label="Confirmar senha *">
          <input
            className={inputCls}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a senha"
            required
          />
        </Field>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isLoading}
            className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {mutation.isLoading ? 'Salvando...' : 'Redefinir senha'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
          >
            Cancelar
          </button>
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
    'usuarios',
    () => api.get('/usuarios').then((r) => r.data),
    { staleTime: 10_000 }
  )

  const toggleAtivoM = useMutation(
    ({ id, ativo }: { id: number; ativo: boolean }) =>
      api.put(`/usuarios/${id}`, { ativo }).then((r) => r.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('usuarios')
        toast.success('Status atualizado!')
      },
      onError: (e: any) =>
        toast.error(e.response?.data?.detail || 'Erro ao atualizar status'),
    }
  )

  const deleteM = useMutation(
    (id: number) => api.delete(`/usuarios/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('usuarios')
        setConfirmDelete(null)
        toast.success('Usuário removido!')
      },
      onError: (e: any) =>
        toast.error(e.response?.data?.detail || 'Erro ao remover usuário'),
    }
  )

  const refresh = () => queryClient.invalidateQueries('usuarios')

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {usuarios?.length ?? 0} usuário(s) cadastrado(s)
        </p>
        <button
          onClick={() => setModalCriar(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Novo usuário
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-400">Carregando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  E-mail
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Perfil
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {usuarios?.map((u) => (
                <tr key={u.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{u.nome}</td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        PERFIL_COLORS[u.perfil] ?? 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {PERFIS.find((p) => p.value === u.perfil)?.label ?? u.perfil}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        toggleAtivoM.mutate({ id: u.id, ativo: !u.ativo })
                      }
                      title={u.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        u.ativo
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-gray-700 text-gray-400 border border-gray-600 hover:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          u.ativo ? 'bg-emerald-400' : 'bg-gray-500'
                        }`}
                      />
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditando(u)}
                        title="Editar"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setResetSenha(u)}
                        title="Redefinir senha"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        🔑
                      </button>
                      <button
                        onClick={() => setConfirmDelete(u)}
                        title="Remover"
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {modalCriar && (
        <UsuarioModal
          usuario={null}
          onClose={() => setModalCriar(false)}
          onSaved={refresh}
        />
      )}
      {editando && (
        <UsuarioModal
          usuario={editando}
          onClose={() => setEditando(null)}
          onSaved={refresh}
        />
      )}
      {resetSenha && (
        <ResetSenhaModal
          usuario={resetSenha}
          onClose={() => setResetSenha(null)}
        />
      )}
      {confirmDelete && (
        <Modal
          title="Confirmar exclusão"
          onClose={() => setConfirmDelete(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Tem certeza que deseja remover o usuário{' '}
              <span className="text-white font-semibold">{confirmDelete.nome}</span>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteM.mutate(confirmDelete.id)}
                disabled={deleteM.isLoading}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {deleteM.isLoading ? 'Removendo...' : 'Sim, remover'}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Tab: E-mail / SMTP ────────────────────────────────────────────────────────

interface SmtpConfig {
  smtp_host: string | null
  smtp_port: number | null
  smtp_user: string | null
  smtp_from: string | null
  smtp_tls: boolean
  smtp_ssl: boolean
  smtp_configurado: boolean
}

function TabSmtp() {
  const [form, setForm] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_senha: '',
    smtp_from: '',
    smtp_tls: true,
    smtp_ssl: false,
  })
  const [testando, setTestando] = useState(false)

  const { data: smtp, isLoading } = useQuery<SmtpConfig>(
    'smtp',
    () => api.get('/configuracoes/smtp').then((r) => r.data),
    {
      onSuccess: (data) => {
        setForm((prev) => ({
          ...prev,
          smtp_host: data.smtp_host ?? '',
          smtp_port: String(data.smtp_port ?? 587),
          smtp_user: data.smtp_user ?? '',
          smtp_from: data.smtp_from ?? '',
          smtp_tls:  data.smtp_tls,
          smtp_ssl:  data.smtp_ssl,
        }))
      },
    }
  )

  const queryClient = useQueryClient()

  const salvarM = useMutation(
    (payload: typeof form) =>
      api
        .put('/configuracoes/smtp', {
          ...payload,
          smtp_port: Number(payload.smtp_port) || 587,
          smtp_senha: payload.smtp_senha || undefined, // omit if empty
        })
        .then((r) => r.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('smtp')
        toast.success('Configurações SMTP salvas!')
        setForm((prev) => ({ ...prev, smtp_senha: '' }))
      },
      onError: (e: any) =>
        toast.error(e.response?.data?.detail || 'Erro ao salvar'),
    }
  )

  const testar = async () => {
    setTestando(true)
    try {
      await api.post('/configuracoes/smtp/testar')
      toast.success('Conexão SMTP estabelecida com sucesso!')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Falha na conexão SMTP')
    } finally {
      setTestando(false)
    }
  }

  const handleTlsSslChange = (field: 'smtp_tls' | 'smtp_ssl', value: boolean) => {
    // TLS e SSL são mutuamente exclusivos
    if (field === 'smtp_ssl' && value) {
      setForm({ ...form, smtp_ssl: true, smtp_tls: false, smtp_port: '465' })
    } else if (field === 'smtp_tls' && value) {
      setForm({ ...form, smtp_tls: true, smtp_ssl: false, smtp_port: '587' })
    } else {
      setForm({ ...form, [field]: value })
    }
  }

  if (isLoading) return <p className="text-gray-400 text-sm">Carregando...</p>

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Status badge */}
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            smtp?.smtp_configurado
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-gray-700 text-gray-400 border border-gray-600'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              smtp?.smtp_configurado ? 'bg-emerald-400' : 'bg-gray-500'
            }`}
          />
          {smtp?.smtp_configurado ? 'SMTP configurado' : 'SMTP não configurado'}
        </span>
        {smtp?.smtp_configurado && (
          <button
            onClick={testar}
            disabled={testando}
            className="px-3 py-1 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
          >
            {testando ? 'Testando...' : 'Testar conexão'}
          </button>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300">Servidor de saída (SMTP)</h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field label="Servidor SMTP (host)">
              <input
                className={inputCls}
                value={form.smtp_host}
                onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </Field>
          </div>
          <Field label="Porta">
            <input
              className={inputCls}
              type="number"
              value={form.smtp_port}
              onChange={(e) => setForm({ ...form, smtp_port: e.target.value })}
              placeholder="587"
            />
          </Field>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.smtp_tls}
              onChange={(e) => handleTlsSslChange('smtp_tls', e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-300">STARTTLS (recomendado — porta 587)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.smtp_ssl}
              onChange={(e) => handleTlsSslChange('smtp_ssl', e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-300">SSL direto (porta 465)</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Usuário (e-mail de login)">
            <input
              className={inputCls}
              value={form.smtp_user}
              onChange={(e) => setForm({ ...form, smtp_user: e.target.value })}
              placeholder="sistema@padaria.com.br"
            />
          </Field>
          <Field label={smtp?.smtp_configurado ? 'Senha (deixe vazio para manter)' : 'Senha'}>
            <input
              className={inputCls}
              type="password"
              value={form.smtp_senha}
              onChange={(e) => setForm({ ...form, smtp_senha: e.target.value })}
              placeholder={smtp?.smtp_configurado ? '••••••••' : 'Senha do e-mail'}
            />
          </Field>
        </div>

        <Field label="Remetente (From)">
          <input
            className={inputCls}
            value={form.smtp_from}
            onChange={(e) => setForm({ ...form, smtp_from: e.target.value })}
            placeholder="ERP Padaria <sistema@padaria.com.br>"
          />
        </Field>

        <div className="bg-gray-800/60 rounded-lg p-3 text-xs text-gray-500 space-y-1">
          <p><span className="text-gray-400 font-medium">Gmail:</span> smtp.gmail.com : 587 (STARTTLS) — necessário habilitar "App Passwords" na conta Google.</p>
          <p><span className="text-gray-400 font-medium">Outlook/365:</span> smtp.office365.com : 587 (STARTTLS).</p>
          <p><span className="text-gray-400 font-medium">Yahoo:</span> smtp.mail.yahoo.com : 587 ou 465 (SSL).</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => salvarM.mutate(form)}
            disabled={salvarM.isLoading}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {salvarM.isLoading ? 'Salvando...' : 'Salvar configurações'}
          </button>
          {smtp?.smtp_configurado && (
            <button
              onClick={testar}
              disabled={testando}
              className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {testando ? 'Testando...' : 'Testar conexão'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'empresa',  label: '🏢 Empresa'      },
  { id: 'usuarios', label: '👥 Usuários'     },
  { id: 'smtp',     label: '✉️ E-mail / SMTP' },
]

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<'empresa' | 'usuarios' | 'smtp'>('empresa')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie os dados da empresa e os usuários do sistema
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-brand-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'empresa'  && <TabEmpresa  />}
      {tab === 'usuarios' && <TabUsuarios />}
      {tab === 'smtp'     && <TabSmtp     />}
    </div>
  )
}
