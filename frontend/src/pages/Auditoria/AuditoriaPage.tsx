import { useState } from 'react'
import { useQuery } from 'react-query'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { api } from '@/config/api'

// ── Human-readable description ────────────────────────────────────────────────

const ENTIDADE_LABEL: Record<string, string> = {
  venda:        'Venda',
  usuario:      'Usuário',
  sessao_caixa: 'Caixa',
  produto:      'Produto',
  estoque:      'Estoque',
  compra:       'Compra',
}

function descrever(log: any): string {
  const ent = ENTIDADE_LABEL[log.entidade] ?? log.entidade
  const id  = `#${log.entidade_id}`
  switch (log.acao) {
    case 'login':    return 'Fez login no sistema'
    case 'logout':   return 'Saiu do sistema'
    case 'criar':
      if (log.entidade === 'sessao_caixa') return `Abriu o Caixa ${id}`
      if (log.entidade === 'venda')        return `Registrou a Venda ${id}`
      return `Criou ${ent} ${id}`
    case 'editar':   return `Editou ${ent} ${id}`
    case 'deletar':  return `Removeu ${ent} ${id}`
    case 'cancelar':
      if (log.entidade === 'venda') return `Cancelou a Venda ${id}`
      return `Cancelou ${ent} ${id}`
    case 'ajuste':   return `Ajustou estoque do Produto ${id}`
    default:         return `${log.acao} em ${ent} ${id}`
  }
}

// ── Action badge ──────────────────────────────────────────────────────────────

const ACAO_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  criar:    { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  editar:   { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  deletar:  { bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' },
  cancelar: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  login:    { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  logout:   { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' },
  ajuste:   { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
}

function AcaoBadge({ acao }: { acao: string }) {
  const s = ACAO_STYLE[acao] ?? ACAO_STYLE.logout
  return (
    <span
      className="inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {acao}
    </span>
  )
}

// ── User avatar ───────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#2D6A4F','#1D4ED8','#7C3AED','#0369A1','#B45309','#0F766E']

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function UserAvatar({ nome }: { nome: string }) {
  const initials = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
      style={{ background: avatarColor(nome) }}
    >
      {initials}
    </div>
  )
}

// ── Date group label ──────────────────────────────────────────────────────────

function dateLabel(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isToday(d))     return 'Hoje'
  if (isYesterday(d)) return 'Ontem'
  return format(d, "dd 'de' MMMM", { locale: ptBR })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditoriaPage() {
  const [entidade, setEntidade] = useState('')
  const [acao,     setAcao]     = useState('')
  const [busca,    setBusca]    = useState('')

  const { data, isLoading } = useQuery(
    ['auditoria', entidade, acao],
    () => api.get(`/auditoria?limit=200${entidade ? `&entidade=${entidade}` : ''}${acao ? `&acao=${acao}` : ''}`).then(r => r.data),
    { staleTime: 15_000 }
  )

  const logs: any[] = (data || []).filter((log: any) => {
    if (!busca.trim()) return true
    const q = busca.toLowerCase()
    return (
      log.usuario_nome?.toLowerCase().includes(q) ||
      descrever(log).toLowerCase().includes(q)
    )
  })

  // Group by day
  const groups: { date: string; items: any[] }[] = []
  for (const log of logs) {
    const day = log.created_at.slice(0, 10)
    const last = groups[groups.length - 1]
    if (last && last.date === day) last.items.push(log)
    else groups.push({ date: day, items: [log] })
  }

  return (
    <div className="p-5 lg:p-6 space-y-5" style={{ background: 'var(--clr-bg)', minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--clr-text)' }}>Log de Auditoria</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>
            Registro completo de ações realizadas no sistema
          </p>
        </div>
        {!isLoading && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg self-start sm:self-auto"
            style={{ background: 'var(--clr-surface)', color: 'var(--clr-text-muted)', border: '1px solid var(--clr-border)' }}
          >
            {logs.length} registro{logs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Buscar por usuário ou ação..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="input flex-1 min-w-[200px]"
        />
        <select value={entidade} onChange={e => setEntidade(e.target.value)} className="input w-48">
          <option value="">Todas as entidades</option>
          <option value="usuario">Usuário</option>
          <option value="venda">Venda</option>
          <option value="produto">Produto</option>
          <option value="sessao_caixa">Caixa</option>
          <option value="estoque">Estoque</option>
          <option value="compra">Compra</option>
        </select>
        <select value={acao} onChange={e => setAcao(e.target.value)} className="input w-44">
          <option value="">Todas as ações</option>
          <option value="login">Login</option>
          <option value="criar">Criar</option>
          <option value="editar">Editar</option>
          <option value="cancelar">Cancelar</option>
          <option value="deletar">Deletar</option>
          <option value="ajuste">Ajuste de Estoque</option>
        </select>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 rounded-2xl" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 gap-3 rounded-2xl"
          style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}
        >
          <span className="text-4xl">🔍</span>
          <p className="text-sm font-semibold" style={{ color: 'var(--clr-text)' }}>Nenhum registro encontrado</p>
          <p className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>Tente ajustar os filtros</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--clr-text-muted)' }}>
                  {dateLabel(group.date + 'T12:00:00')}
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--clr-border)' }} />
                <span className="text-[10px] font-semibold" style={{ color: 'var(--clr-text-muted)' }}>
                  {group.items.length} evento{group.items.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Log entries */}
              <div
                className="rounded-2xl overflow-hidden divide-y"
                style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}
              >
                {group.items.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 px-4 py-3 transition-colors"
                    style={{ borderBottom: '1px solid var(--clr-border)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-green-pale)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    {/* Avatar */}
                    <UserAvatar nome={log.usuario_nome} />

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold leading-tight" style={{ color: 'var(--clr-text)' }}>
                          {log.usuario_nome}
                        </span>
                        {log.usuario_perfil && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--clr-bg)', color: 'var(--clr-text-muted)', border: '1px solid var(--clr-border)' }}
                          >
                            {log.usuario_perfil}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--clr-text-muted)' }}>
                        {descrever(log)}
                      </p>
                    </div>

                    {/* Badge */}
                    <div className="shrink-0 hidden sm:block">
                      <AcaoBadge acao={log.acao} />
                    </div>

                    {/* Time + IP */}
                    <div className="text-right shrink-0">
                      <p className="font-mono text-xs font-bold" style={{ color: 'var(--clr-text-muted)' }}>
                        {format(new Date(log.created_at), 'HH:mm:ss')}
                      </p>
                      {log.ip_address && (
                        <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--clr-text-muted)', opacity: 0.6 }}>
                          {log.ip_address}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes skeletonPulse { 0%,100%{opacity:1} 50%{opacity:.45} }
      `}</style>
    </div>
  )
}
