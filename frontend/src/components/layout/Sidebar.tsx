import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useEmpresaStore } from '@/store/empresaStore'

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
const IconWhatsapp = () => (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
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
      { to: '/pdv',       icon: <IconPDV />,        label: 'Frente de Caixa', perfis: ['admin','gerente','caixa'] },
      { to: '/caixa',     icon: <IconCaixa />,      label: 'Caixa',           perfis: ['admin','gerente','caixa'] },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { to: '/dashboard',  icon: <IconDashboard />,  label: 'Dashboard',      perfis: ['admin','gerente'] },
      { to: '/estoque',    icon: <IconEstoque />,    label: 'Estoque',         perfis: ['admin','gerente','estoquista'] },
      { to: '/relatorios', icon: <IconRelatorios />, label: 'Relatórios',      perfis: ['admin','gerente'] },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/auditoria',     icon: <IconAuditoria />, label: 'Auditoria',    perfis: ['admin','gerente'] },
      { to: '/configuracoes', icon: <IconConfig />,    label: 'Configurações', perfis: ['admin'] },
      { to: '/whatsapp',      icon: <IconWhatsapp />,  label: 'WhatsApp',     perfis: ['admin','gerente'] },
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

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate         = useNavigate()
  const empresa          = useEmpresaStore(s => s.empresa)

  const handleLogout = () => { logout(); navigate('/login') }
  const inicial = (empresa?.nome ?? 'P').charAt(0).toUpperCase()
  const userInitials = (user?.nome ?? '?')
    .split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()

  return (
    <aside
      className="w-56 flex flex-col shrink-0"
      style={{
        background: 'linear-gradient(180deg, #1F3320 0%, var(--clr-sidebar) 60%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo / Empresa */}
      <div
        className="px-4 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--clr-green-med), var(--clr-green))',
              boxShadow: '0 2px 8px rgba(45,106,79,0.5)',
            }}
          >
            {empresa?.logo_url
              ? <img src={empresa.logo_url} alt="logo" className="w-full h-full object-cover" />
              : (
                <svg viewBox="0 0 200 200" className="w-6 h-6">
                  {/* Thin wheat stalk above P */}
                  <line x1="76" y1="56" x2="76" y2="26" stroke="rgba(216,243,220,0.65)" strokeWidth="4" strokeLinecap="round"/>
                  <ellipse cx="63" cy="44" rx="7" ry="12" fill="#D8F3DC" transform="rotate(27 63 44)" opacity="0.80"/>
                  <ellipse cx="89" cy="40" rx="7" ry="12" fill="#D8F3DC" transform="rotate(-27 89 40)" opacity="0.80"/>
                  <ellipse cx="76" cy="26" rx="5" ry="9"  fill="#D8F3DC" opacity="0.95"/>
                  <line x1="76" y1="26" x2="68" y2="16" stroke="#B7E4C7" strokeWidth="3" strokeLinecap="round" opacity="0.68"/>
                  <line x1="76" y1="26" x2="84" y2="16" stroke="#B7E4C7" strokeWidth="3" strokeLinecap="round" opacity="0.68"/>
                  {/* Bold P */}
                  <line x1="76" y1="54" x2="76" y2="176" stroke="rgba(216,243,220,0.97)" strokeWidth="22" strokeLinecap="round"/>
                  <path d="M 76 54 A 48 43 0 0 1 76 140" fill="none" stroke="rgba(216,243,220,0.97)" strokeWidth="22" strokeLinecap="round"/>
                </svg>
              )
            }
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm leading-tight truncate" style={{ color: 'rgba(230,250,230,0.95)' }}>
              {empresa?.nome ?? 'Padaria'}
            </div>
            <div className="text-[10px] mt-0.5 font-semibold tracking-wide" style={{ color: 'var(--clr-accent)' }}>
              SISTEMA PDV
            </div>
          </div>
        </div>
      </div>

      {/* Nav com grupos */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map(group => {
          const visible = group.items.filter(i => user && i.perfis.includes(user.perfil))
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
