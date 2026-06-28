import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { api } from '@/config/api'
import { useEmpresaStore } from '@/store/empresaStore'
import { useAuthStore } from '@/store/authStore'

const PAGE_NAMES: Record<string, string> = {
  '/pdv':           'PDV',
  '/dashboard':     'Dashboard',
  '/estoque':       'Estoque',
  '/caixa':         'Caixa',
  '/relatorios':    'Relatórios',
  '/auditoria':     'Auditoria',
  '/configuracoes': 'Configurações',
  '/compras':       'Compras',
  '/admin':         'Admin Central',
  '/docs':          'Documentação'
}

function TopBar() {
  const { pathname } = useLocation()
  const { user }     = useAuthStore()
  const pageName     = PAGE_NAMES[pathname] ?? ''

  const initials = (user?.nome ?? '?')
    .split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()

  return (
    <header
      className="h-14 flex items-center justify-between px-4 shrink-0 lg:h-12 lg:px-5"
      style={{
        background: 'var(--clr-surface)',
        borderBottom: '1px solid var(--clr-border)',
      }}
    >
      {/* Mobile: logo mark + nome do sistema */}
      <div className="flex items-center gap-2.5 lg:hidden">
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
          <svg viewBox="0 0 240 240" className="w-8 h-8">
            <rect width="240" height="240" fill="#192819"/>
            <path d="M 18 46 L 80 46 L 126 164 L 126 194 L 96 194 L 48 56 Z" fill="rgba(255,255,255,0.96)"/>
            <path d="M 114 46 L 174 46 L 208 194 L 178 194 L 144 56 L 114 76 Z" fill="#52B788"/>
          </svg>
        </div>
        <span className="font-bold text-sm" style={{ color: 'var(--clr-text)' }}>Nexshell</span>
      </div>

      {/* Desktop: nome da página */}
      <h1 className="hidden lg:block font-bold text-base" style={{ color: 'var(--clr-text)' }}>{pageName}</h1>

      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--clr-text-muted)' }}>{user?.perfil}</p>
        </div>
        <div
          className="w-9 h-9 lg:w-8 lg:h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-md"
          style={{ background: 'var(--clr-green)' }}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}

export default function AppLayout() {
  const setEmpresa = useEmpresaStore(s => s.setEmpresa)

  useEffect(() => {
    api.get('/configuracoes/empresa')
      .then(r => setEmpresa(r.data))
      .catch(() => {})
  }, [])

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-50">
      {/* Sidebar - Desktop only */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <TopBar />

        <main className="flex-1 overflow-y-auto pb-[70px] lg:pb-0">
          <Outlet />
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
