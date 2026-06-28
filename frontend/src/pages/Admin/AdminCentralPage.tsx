import { useQuery } from 'react-query'
import { api } from '@/config/api'

interface Tenant {
  slug: string
  domain: string
  name: string
  port: number
  status: string
}

interface DashboardData {
  tenants: Tenant[]
  total_tenants: number
}

export default function AdminCentralPage() {
  const { data, isLoading, error } = useQuery<DashboardData>(
    'super-admin-dashboard',
    () => api.get('/super-admin/dashboard').then(r => r.data)
  )

  if (isLoading) return <div className="p-8 text-center text-gray-500">Carregando instâncias...</div>
  if (error) return <div className="p-8 text-center text-red-500 font-bold">Erro ao carregar instâncias</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Admin Central</h1>
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm font-bold">
          {data?.total_tenants} Instâncias Ativas
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.tenants.map(tenant => (
          <div key={tenant.slug} className="bakery-card flex flex-col">
            <h3 className="text-lg font-bold text-gray-800">{tenant.name}</h3>
            <p className="text-xs text-gray-400 font-mono mb-4">{tenant.slug}</p>
            <div className="space-y-2 flex-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Domínio</span>
                <a href={`https://${tenant.domain}`} target="_blank" rel="noreferrer" className="text-green-600 hover:underline">{tenant.domain}</a>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Porta</span>
                <span className="font-mono">{tenant.port}</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
               <a href={`https://${tenant.domain}/api/docs`} target="_blank" className="btn-bakery text-[11px] py-2 text-center">Docs</a>
               <a href={`https://${tenant.domain}`} target="_blank" className="btn-primary text-[11px] py-2 text-center">Acessar</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
