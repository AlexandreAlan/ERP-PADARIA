import { create } from 'zustand'

export interface CartItem {
  produto_id: number
  nome: string
  preco_unit: number
  custo_unit: number
  quantidade: number
  desconto_unit: number
  unidade_medida: string
  total_item: number
}

interface PDVState {
  sessaoId: number | null
  cart: CartItem[]
  desconto: number           // valor absoluto em R$
  descontoPct: number
  observacao: string

  setSessaoId: (id: number | null) => void
  addItem: (item: Omit<CartItem, 'total_item'>) => void
  updateQuantidade: (produto_id: number, quantidade: number) => void
  removeItem: (produto_id: number) => void
  clearCart: () => void
  setDesconto: (valor: number, pct?: number) => void
  setObservacao: (obs: string) => void

  // Computed
  subtotal: () => number
  total: () => number
}

export const usePDVStore = create<PDVState>((set, get) => ({
  sessaoId: null,
  cart: [],
  desconto: 0,
  descontoPct: 0,
  observacao: '',

  setSessaoId: (id) => set({ sessaoId: id }),

  addItem: (item) =>
    set((state) => {
      const existing = state.cart.find((c) => c.produto_id === item.produto_id)
      if (existing) {
        // Incrementa quantidade se já existe
        return {
          cart: state.cart.map((c) =>
            c.produto_id === item.produto_id
              ? {
                  ...c,
                  quantidade: c.quantidade + item.quantidade,
                  total_item: (c.quantidade + item.quantidade) * (c.preco_unit - c.desconto_unit),
                }
              : c
          ),
        }
      }
      const total_item = item.quantidade * (item.preco_unit - item.desconto_unit)
      return { cart: [...state.cart, { ...item, total_item }] }
    }),

  updateQuantidade: (produto_id, quantidade) =>
    set((state) => {
      if (quantidade <= 0) {
        return { cart: state.cart.filter((c) => c.produto_id !== produto_id) }
      }
      return {
        cart: state.cart.map((c) =>
          c.produto_id === produto_id
            ? { ...c, quantidade, total_item: quantidade * (c.preco_unit - c.desconto_unit) }
            : c
        ),
      }
    }),

  removeItem: (produto_id) =>
    set((state) => ({ cart: state.cart.filter((c) => c.produto_id !== produto_id) })),

  clearCart: () => set({ cart: [], desconto: 0, descontoPct: 0, observacao: '' }),

  setDesconto: (valor, pct = 0) => set({ desconto: valor, descontoPct: pct }),

  setObservacao: (obs) => set({ observacao: obs }),

  subtotal: () => get().cart.reduce((acc, item) => acc + item.total_item, 0),

  total: () => {
    const sub = get().subtotal()
    const desc = get().descontoPct > 0
      ? sub * get().descontoPct / 100
      : get().desconto
    return Math.max(0, sub - desc)
  },
}))
