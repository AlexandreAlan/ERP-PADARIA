import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [senha, setSenha]       = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)

  const loginMutation = useMutation(
    (creds: { email: string; senha: string }) =>
      api.post('/auth/login', creds).then(r => r.data),
    {
      onSuccess: (data) => {
        setAuth(
          { id: data.usuario_id, nome: data.usuario_nome, perfil: data.perfil },
          data.access_token,
          data.refresh_token
        )
        navigate('/')
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.detail || 'E-mail ou senha incorretos')
      },
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate({ email, senha })
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--clr-bg)' }}>

      {/* Painel esquerdo — marca */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12"
        style={{ background: 'var(--clr-sidebar)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base"
            style={{ background: 'var(--clr-green-med)', color: '#fff' }}
          >
            P
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: 'rgba(220,245,220,0.9)' }}>
              Artesanal
            </div>
            <div className="text-[10px] font-medium tracking-widest" style={{ color: 'var(--clr-accent)' }}>
              SISTEMA PDV
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-5">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(82,183,136,0.15)', color: 'var(--clr-accent)', border: '1px solid rgba(82,183,136,0.2)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--clr-accent)' }} />
            Sistema Online
          </div>

          <h1 className="text-3xl font-bold leading-snug" style={{ color: 'rgba(220,245,220,0.95)' }}>
            Gestão completa<br />para sua padaria.
          </h1>

          <p className="text-sm leading-relaxed" style={{ color: 'rgba(180,220,180,0.55)' }}>
            Controle caixa, estoque e vendas em tempo real com um sistema pensado para padeiros de verdade.
          </p>

          <div className="space-y-3 pt-2">
            {[
              'PDV com leitor de código de barras',
              'Controle de estoque automático',
              'Relatórios e curva ABC de produtos',
              'Controle de caixa por operador',
            ].map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(82,183,136,0.2)' }}
                >
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--clr-accent)' }}>
                    <path d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <span className="text-xs" style={{ color: 'rgba(180,220,180,0.65)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.15)' }}>
          v2.0 · Sistema ERP para Padarias
        </p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-7">

          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{ background: 'var(--clr-green)', color: '#fff' }}
            >
              P
            </div>
            <span className="font-bold text-[var(--clr-text)]">Artesanal PDV</span>
          </div>

          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--clr-text)' }}>Acessar sistema</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--clr-text-muted)' }}>
              Informe seu e-mail e senha para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@padaria.com"
                className="input h-11"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="input h-11 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--clr-text-muted)' }}
                >
                  {showSenha ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isLoading}
              className="btn-action w-full h-11 text-sm"
            >
              {loginMutation.isLoading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>

          {/* Demo */}
          <div className="rounded-xl p-4" style={{ background: 'var(--clr-green-pale)', border: '1px solid var(--clr-border)' }}>
            <p className="label mb-3">Acesso de Demonstração</p>
            <div className="space-y-1.5">
              {[
                { perfil: 'Admin',    email: 'admin@padaria.com', senha: 'Admin@1234' },
                { perfil: 'Operador', email: 'caixa@padaria.com', senha: 'Caixa@1234' },
              ].map(c => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => { setEmail(c.email); setSenha(c.senha) }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors"
                  style={{ background: '#fff', border: '1px solid var(--clr-border)', color: 'var(--clr-text)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--clr-green-med)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--clr-border)'}
                >
                  <span className="font-semibold" style={{ color: 'var(--clr-text-med)' }}>{c.perfil}</span>
                  <span className="font-mono text-[11px]" style={{ color: 'var(--clr-text-muted)' }}>{c.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
