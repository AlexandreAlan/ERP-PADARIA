import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useEmpresaStore } from '@/store/empresaStore'

const navItems = [
  { to: '/pdv',           icon: '🛒', label: 'PDV / Caixa',   perfis: ['admin','gerente','caixa'] },
  { to: '/dashboard',     icon: '📊', label: 'Dashboard',      perfis: ['admin','gerente'] },
  { to: '/estoque',       icon: '📦', label: 'Estoque',         perfis: ['admin','gerente','estoquista'] },
  { to: '/caixa',         icon: '💵', label: 'Controle Caixa', perfis: ['admin','gerente','caixa'] },
  { to: '/relatorios',    icon: '📄', label: 'Relatórios',      perfis: ['admin','gerente'] },
  { to: '/auditoria',     icon: '🔍', label: 'Auditoria',       perfis: ['admin','gerente'] },
  { to: '/configuracoes', icon: '⚙',  label: 'Configurações',  perfis: ['admin'] },
  { to: '/whatsapp',     icon: '💬', label: 'WhatsApp',         perfis: ['admin','gerente'] },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate         = useNavigate()
  const empresa          = useEmpresaStore((s) => s.empresa)

  const visibleItems = navItems.filter(item =>
    user && item.perfis.includes(user.perfil)
  )

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-700 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {empresa?.logo_url ? (
            <img
              src={empresa.logo_url}
              alt="logo"
              className="w-8 h-8 rounded object-cover shrink-0"
            />
          ) : (
            <span className="text-2xl">🥖</span>
          )}
          <div className="min-w-0">
            <div className="font-bold text-white text-sm truncate">
              {empresa?.nome ?? 'ERP Padaria'}
            </div>
            <div className="text-xs text-gray-500">v1.0</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-700/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer: user info + logout */}
      <div className="p-3 border-t border-gray-700">
        <div className="px-2 py-1 mb-2">
          <div className="text-sm font-medium text-gray-300 truncate">{user?.nome}</div>
          <div className="text-xs text-gray-500 capitalize">{user?.perfil}</div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
        >
          🚪 Sair
        </button>
      </div>
    </aside>
  )
}
