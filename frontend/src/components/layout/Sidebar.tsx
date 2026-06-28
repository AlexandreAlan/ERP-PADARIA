import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useEmpresaStore } from '@/store/empresaStore'
import { useIsMobile } from '@/Mobile/Android/useIsMobile'

const IconPDV = () => (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
)
const IconDashboard = () => (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
)
const IconEstoque = () => (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
)
const IconCaixa = () => (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
  </svg>
)
const IconRelatorios = () => (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z" />
    <path d="M16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    <path d="M6 18.75h12" />
  </svg>
)
const IconAuditoria = () => (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
)
const IconConfig = () => (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const IconDocs = () => (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
)
const IconLogout = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
  </svg>
)

const NAV_GROUPS = [
  {
    label: 'Operação',
    items: [
      { to: '/pdv',       icon: <IconPDV />,        label: 'Frente de Caixa', perfis: ['admin','gerente','caixa','super_admin'],        mobileHide: true },
      { to: '/caixa',     icon: <IconCaixa />,      label: 'Caixa',           perfis: ['admin','gerente','caixa','super_admin'],        mobileHide: true },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { to: '/dashboard',  icon: <IconDashboard />,  label: 'Dashboard',      perfis: ['admin','gerente','super_admin'],                mobileHide: false },
      { to: '/estoque',    icon: <IconEstoque />,    label: 'Estoque',         perfis: ['admin','gerente','estoquista','super_admin'],   mobileHide: true },
      { to: '/relatorios', icon: <IconRelatorios />, label: 'Relatórios',      perfis: ['admin','gerente','super_admin'],                mobileHide: false },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/auditoria',     icon: <IconAuditoria />, label: 'Auditoria',    perfis: ['admin','gerente','super_admin'],                mobileHide: false },
      { to: '/configuracoes', icon: <IconConfig />,    label: 'Configurações', perfis: ['admin','super_admin'],                         mobileHide: false },
      { to: '/docs',          icon: <IconDocs />,      label: 'Docs',         perfis: ['admin','gerente','caixa','estoquista','super_admin'], mobileHide: true },
      { to: '/admin',         icon: <IconDashboard />, label: 'Admin Central', perfis: ['super_admin'],                                 mobileHide: false },
    ],
  },
]

function avatarBg(name: string): string {
  const COLORS = ['#2D6A4F','#40916C','#1D4ED8','#6D28D9','#0369A1','#B45309']
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return COLORS[Math.abs(h) % COLORS.length]
}

const perfilLabel: Record<string, string> = {
  admin:      'Administrador',
  gerente:    'Gerente',
  caixa:      'Op. de Caixa',
  estoquista: 'Estoquista',
}

export default function Sidebar({ onLogout }: { onLogout?: () => void }) {
  const { user, logout } = useAuthStore()
  const navigate         = useNavigate()
  const empresa          = useEmpresaStore(s => s.empresa)
  const isMobile         = useIsMobile()

  const handleLogout = () => { 
    logout(); 
    if (onLogout) onLogout();
    navigate('/login') 
  }
  const inicial = (empresa?.nome ?? 'P').charAt(0).toUpperCase()
  const userInitials = (user?.nome ?? '?')
    .split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()

  return (
    <aside
      className="w-64 lg:w-56 h-full flex flex-col shrink-0"
      style={{
        background: 'linear-gradient(180deg, #1F3320 0%, var(--clr-sidebar) 60%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo / Empresa */}
      <div
        className="px-4 py-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl shrink-0 overflow-hidden">
            {empresa?.logo_url
              ? <img src={empresa.logo_url} alt="logo" className="w-full h-full object-cover" />
              : (
                <svg viewBox="0 0 240 240" className="w-9 h-9">
                  <rect width="240" height="240" fill="#192819"/>
                  <path d="M 18 46 L 80 46 L 126 164 L 126 194 L 96 194 L 48 56 Z"
                        fill="rgba(255,255,255,0.96)"/>
                  <path d="M 114 46 L 174 46 L 208 194 L 178 194 L 144 56 L 114 76 Z"
                        fill="#52B788"/>
                </svg>
              )
            }
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm leading-tight truncate" style={{ color: 'rgba(230,250,230,0.95)' }}>
              {empresa?.nome ?? 'Nexshell'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav com grupos */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map(group => {
          const visible = group.items.filter(i =>
            user && i.perfis.includes(user.perfil) && !(isMobile && i.mobileHide)
          )
          if (!visible.length) return null
          return (
            <div key={group.label}>
              <p
                className="text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5"
                style={{ color: 'rgba(180,220,180,0.25)' }}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visible.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item'}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Usuário */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-2"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs text-white"
            style={{
              background: `linear-gradient(135deg, ${avatarBg(user?.nome ?? '')}, ${avatarBg(user?.nome ?? '') + 'CC'})`,
              boxShadow: '0 0 0 2px rgba(255,255,255,0.1)',
            }}
          >
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold truncate" style={{ color: 'rgba(220,245,220,0.9)' }}>
              {user?.nome}
            </div>
            <div className="text-[10px] truncate" style={{ color: 'rgba(180,220,180,0.45)' }}>
              {perfilLabel[user?.perfil ?? ''] ?? user?.perfil}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          style={{ color: 'rgba(180,220,180,0.35)' }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = '#FCA5A5'
            el.style.background = 'rgba(239,68,68,0.1)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = 'rgba(180,220,180,0.35)'
            el.style.background = 'transparent'
          }}
        >
          <IconLogout />
          Sair do sistema
        </button>
      </div>
    </aside>
  )
}
