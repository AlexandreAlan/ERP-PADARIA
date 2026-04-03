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
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Log de Auditoria</h1>

      <div className="flex gap-3 mb-6">
        <select value={entidade} onChange={e => setEntidade(e.target.value)} className="input w-48">
          <option value="">Todas as entidades</option>
          <option value="usuario">Usuário</option>
          <option value="venda">Venda</option>
          <option value="produto">Produto</option>
          <option value="sessao_caixa">Caixa</option>
        </select>
        <select value={acao} onChange={e => setAcao(e.target.value)} className="input w-40">
          <option value="">Todas as ações</option>
          <option value="criar">Criar</option>
          <option value="editar">Editar</option>
          <option value="deletar">Deletar</option>
          <option value="cancelar">Cancelar</option>
          <option value="login">Login</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
              <th className="text-left px-4 py-3">Data/Hora</th>
              <th className="text-left px-4 py-3">Entidade</th>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Ação</th>
              <th className="text-left px-4 py-3">Usuário</th>
              <th className="text-left px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((log: any, i: number) => (
              <tr key={log.id} className={`border-b border-gray-800 text-sm ${i % 2 ? 'bg-gray-900/30' : ''}`}>
                <td className="px-4 py-2 font-mono text-gray-400 text-xs">
                  {format(new Date(log.created_at), 'dd/MM/yy HH:mm:ss')}
                </td>
                <td className="px-4 py-2 text-gray-300">{log.entidade}</td>
                <td className="px-4 py-2 font-mono text-gray-500">#{log.entidade_id}</td>
                <td className="px-4 py-2">
                  <AcaoBadge acao={log.acao} />
                </td>
                <td className="px-4 py-2 text-gray-300">{log.usuario_id || 'Sistema'}</td>
                <td className="px-4 py-2 font-mono text-gray-500 text-xs">{log.ip_address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <div className="text-center py-4 text-gray-400">Carregando...</div>}
      </div>
    </div>
  )
}

function AcaoBadge({ acao }: { acao: string }) {
  const map: Record<string, string> = {
    criar: 'bg-green-900/50 text-green-300',
    editar: 'bg-blue-900/50 text-blue-300',
    deletar: 'bg-red-900/50 text-red-300',
    cancelar: 'bg-orange-900/50 text-orange-300',
    login: 'bg-gray-700 text-gray-300',
    logout: 'bg-gray-700 text-gray-400',
    ajuste: 'bg-yellow-900/50 text-yellow-300',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${map[acao] || 'bg-gray-700 text-gray-300'}`}>
      {acao}
    </span>
  )
}
