import { describe, it, expect, beforeEach } from 'vitest'
import { usePDVStore } from './pdvStore'

const base = {
  nome: 'Pão',
  preco_unit: 5,
  custo_unit: 3,
  desconto_unit: 0,
  unidade_medida: 'un',
}

beforeEach(() => {
  usePDVStore.setState({ cart: [], desconto: 0, descontoPct: 0, observacao: '' })
})

describe('carrinho do PDV', () => {
  it('adiciona item calculando o total', () => {
    usePDVStore.getState().addItem({ ...base, produto_id: 1, quantidade: 2 })
    const cart = usePDVStore.getState().cart
    expect(cart).toHaveLength(1)
    expect(cart[0].total_item).toBe(10) // 2 * (5 - 0)
  })

  it('mescla quantidade ao adicionar o mesmo produto', () => {
    const { addItem } = usePDVStore.getState()
    addItem({ ...base, produto_id: 1, quantidade: 2 })
    addItem({ ...base, produto_id: 1, quantidade: 3 })
    const cart = usePDVStore.getState().cart
    expect(cart).toHaveLength(1)
    expect(cart[0].quantidade).toBe(5)
    expect(cart[0].total_item).toBe(25)
  })

  it('remove o item quando a quantidade cai para zero ou menos', () => {
    const s = usePDVStore.getState()
    s.addItem({ ...base, produto_id: 1, quantidade: 2 })
    s.updateQuantidade(1, 0)
    expect(usePDVStore.getState().cart).toHaveLength(0)
  })

  it('subtotal soma o total dos itens', () => {
    const s = usePDVStore.getState()
    s.addItem({ ...base, produto_id: 1, quantidade: 2 }) // 10
    s.addItem({ ...base, produto_id: 2, quantidade: 1, preco_unit: 8 }) // 8
    expect(usePDVStore.getState().subtotal()).toBe(18)
  })
})

describe('total com desconto', () => {
  it('aplica desconto absoluto', () => {
    const s = usePDVStore.getState()
    s.addItem({ ...base, produto_id: 1, quantidade: 20 }) // subtotal 100
    s.setDesconto(15)
    expect(usePDVStore.getState().total()).toBe(85)
  })

  it('aplica desconto percentual', () => {
    const s = usePDVStore.getState()
    s.addItem({ ...base, produto_id: 1, quantidade: 20 }) // subtotal 100
    s.setDesconto(0, 10)
    expect(usePDVStore.getState().total()).toBe(90)
  })

  it('nunca fica negativo', () => {
    const s = usePDVStore.getState()
    s.addItem({ ...base, produto_id: 1, quantidade: 2 }) // subtotal 10
    s.setDesconto(999)
    expect(usePDVStore.getState().total()).toBe(0)
  })
})
