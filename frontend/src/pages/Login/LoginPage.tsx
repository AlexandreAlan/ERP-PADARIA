import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from 'react-query'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const [email, setEmail]   = useState('')
  const [senha, setSenha]   = useState('')
  const navigate            = useNavigate()
  const setAuth             = useAuthStore(s => s.setAuth)

  const loginMutation = useMutation(
    (creds: { email: string; senha: string }) => api.post('/auth/login', creds).then(r => r.data),
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
        toast.error(err.response?.data?.detail || 'Email ou senha incorretos')
      },
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate({ email, senha })
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🥖</div>
          <h1 className="text-3xl font-bold text-white">ERP Padaria</h1>
          <p className="text-gray-400 mt-1">Sistema de Gestão e PDV</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl p-6 border border-gray-700 space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              placeholder="seu@email.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isLoading}
            className="btn-primary w-full py-3 text-base"
          >
            {loginMutation.isLoading ? '⏳ Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-4">
          ERP Padaria v1.0 — FastAPI + React
        </p>
      </div>
    </div>
  )
}
