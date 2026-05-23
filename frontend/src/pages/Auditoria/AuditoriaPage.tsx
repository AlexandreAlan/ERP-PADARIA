import { useState } from 'react'
import { useQuery } from 'react-query'
import { format } from 'date-fns'
import { api } from '@/config/api'

export default function AuditoriaPage() {
  const [entidade, setEntidade] = useState('')
  const [acao,     setAcao]     = useState('')

  const { data, isLoading } = useQuery(
    ['auditoria', entidade, acao],
    () => api.get(`/auditoria?${entidade ? `entidade=${entidade}&` : ''}${acao ? `acao=${acao}` : ''}`).then(r => r.data),
    { staleTime: 15_000 }
  )

  return (
    <div className="p-6 space-y-5" style={{ background: 'var(--clr-bg)', minHeight: '100vh' }}>

      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--clr-text)' }}>Log de Auditoria</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>Registro completo de ações realizadas no sistema</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select value={entidade} onChange={e => setEntidade(e.target.value)} className="input w-52">
          <option value="">Todas as entidades</option>
          <option value="usuario">Usuário</option>
          <option value="venda">Venda</option>
          <option value="produto">Produto</option>
          <option value="sessao_caixa">Caixa</option>
        </select>
        <select value={acao} onChange={e => setAcao(e.target.value)} className="input w-44">
          <option value="">Todas as ações</option>
          <option value="criar">Criar</option>
          <option value="editar">Editar</option>
          <option value="deletar">Deletar</option>
          <option value="cancelar">Cancelar</option>
          <option value="login">Login</option>
        </select>
      </div>

      {/* Tabela */}
      <div
        className="rounded-2xl overflow-hidden overflow-x-auto"
        style={{ border: '1px solid var(--clr-border)', background: 'var(--clr-surface)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--clr-border)', background: 'var(--clr-green-pale)' }}>
              {['Data/Hora', 'Entidade', 'ID', 'Ação', 'Usuário', 'IP'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--clr-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data || []).map((log: any, i: number) => (
              <tr
                key={log.id}
                style={{
                  borderBottom: '1px solid var(--clr-border)',
                  background: i % 2 === 0 ? 'var(--clr-surface)' : 'var(--clr-bg)',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-green-pale)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'var(--clr-surface)' : 'var(--clr-bg)'}
              >
                <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--clr-text-muted)' }}>
                  {format(new Date(log.created_at), 'dd/MM/yy HH:mm:ss')}
                </td>
                <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--clr-text)' }}>{log.entidade}</td>
                <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--clr-text-muted)' }}>#{log.entidade_id}</td>
                <td className="px-4 py-2.5">
                  <AcaoBadge acao={log.acao} />
                </td>
                <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--clr-text)' }}>{log.usuario_id || 'Sistema'}</td>
                <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--clr-text-muted)' }}>{log.ip_address || '—'}</td>
              </tr>
            ))}
            {!isLoading && (data || []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--clr-text-muted)' }}>
                  Nenhum registro encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {isLoading && (
          <div className="flex items-center justify-center gap-3 py-8" style={{ color: 'var(--clr-text-muted)' }}>
            <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--clr-border-2)', borderTopColor: 'var(--clr-green)' }} />
            <span className="text-sm">Carregando...</span>
          </div>
        )}
      </div>
    </div>
  )
}

function AcaoBadge({ acao }: { acao: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    criar:    { bg: 'var(--clr-green-lite)', color: 'var(--clr-green)',   border: 'var(--clr-border-2)' },
    editar:   { bg: '#EFF6FF',              color: '#1D4ED8',             border: '#BFDBFE' },
    deletar:  { bg: 'var(--clr-danger-bg)', color: 'var(--clr-danger)',   border: '#FCA5A5' },
    cancelar: { bg: 'var(--clr-warning-bg)',color: 'var(--clr-warning)',  border: '#FDE68A' },
    login:    { bg: 'var(--clr-green-pale)',color: 'var(--clr-text-muted)', border: 'var(--clr-border)' },
    logout:   { bg: 'var(--clr-green-pale)',color: 'var(--clr-text-muted)', border: 'var(--clr-border)' },
    ajuste:   { bg: '#F5F3FF',              color: '#6D28D9',             border: '#DDD6FE' },
  }

  const s = styles[acao] ?? styles.login

  return (
    <span
      className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {acao}
    </span>
  )
}
