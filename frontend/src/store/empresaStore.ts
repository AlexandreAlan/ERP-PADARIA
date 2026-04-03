import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface EmpresaConfig {
  id: number
  nome: string
  cnpj: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  cidade: string | null
  logo_url: string | null
  mensagem_rodape: string | null
}

interface EmpresaState {
  empresa: EmpresaConfig | null
  setEmpresa: (empresa: EmpresaConfig) => void
  clearEmpresa: () => void
}

export const useEmpresaStore = create<EmpresaState>()(
  persist(
    (set) => ({
      empresa: null,
      setEmpresa: (empresa) => set({ empresa }),
      clearEmpresa: () => set({ empresa: null }),
    }),
    { name: 'erp-empresa' }
  )
)
