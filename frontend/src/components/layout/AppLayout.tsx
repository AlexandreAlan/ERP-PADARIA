import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { api } from '@/config/api'
import { useEmpresaStore } from '@/store/empresaStore'

export default function AppLayout() {
  const setEmpresa = useEmpresaStore((s) => s.setEmpresa)

  useEffect(() => {
    api.get('/configuracoes/empresa')
      .then((r) => setEmpresa(r.data))
      .catch(() => {/* silencia erros — dados do cache local ainda serão usados */})
  }, [])

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
