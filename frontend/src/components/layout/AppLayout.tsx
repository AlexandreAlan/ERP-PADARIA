import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { api } from '@/config/api'
import { useEmpresaStore } from '@/store/empresaStore'
import { useAuthStore } from '@/store/authStore'

const PAGE_NAMES: Record<string, string> = {
  '/pdv':           'Frente de Caixa',
  '/dashboard':     'Dashboard',
  '/estoque':       'Estoque',
  '/caixa':         'Caixa',
  '/relatorios':    'Relatórios',
  '/auditoria':     'Auditoria',
  '/configuracoes': 'Configurações',
  '/whatsapp':      'WhatsApp',
}

function TopBar() {
  const { pathname } = useLocation()
  const { user }     = useAuthStore()
  const empresa      = useEmpresaStore(s => s.empresa)
  const pageName     = PAGE_NAMES[pathname] ?? ''

  const initials = (user?.nome ?? '?')
    .split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()

  const now = new Date()
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <header
      className="h-12 flex items-center justify-between px-5 shrink-0"
      style={{
        background: 'var(--clr-surface)',
        borderBottom: '1px solid var(--clr-border)',
        boxShadow: '0 1px 0 0 rgba(45,106,79,0.04)',
      }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span style={{ color: 'var(--clr-text-muted)', fontSize: 12 }}>
          {empresa?.nome ?? 'Padaria'}
        </span>
        {pageName && (
          <>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--clr-border-2)' }}>
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-semibold" style={{ color: 'var(--clr-text)' }}>{pageName}</span>
          </>
        )}
      </div>

      {/* Direita: hora + avatar */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-mono font-semibold" style={{ color: 'var(--clr-text)' }}>{timeStr}</div>
          <div className="text-[10px]" style={{ color: 'var(--clr-text-muted)' }}>{dateStr}</div>
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
          style={{ background: 'var(--clr-green)', boxShadow: '0 0 0 2px var(--clr-green-lite)' }}
          title={user?.nome}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}

export default function AppLayout() {
  const setEmpresa    = useEmpresaStore(s => s.setEmpresa)
  const { pathname }  = useLocation()
  const isPDV         = pathname === '/pdv'

  useEffect(() => {
    api.get('/configuracoes/empresa')
      .then(r => setEmpresa(r.data))
      .catch(() => {})
  }, [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--clr-bg)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isPDV && <TopBar />}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
