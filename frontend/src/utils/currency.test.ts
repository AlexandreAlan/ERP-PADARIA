import { describe, it, expect } from 'vitest'
import { formatBRL, parseBRL } from './currency'

// Normaliza qualquer espaço (o Intl usa NBSP/narrow-NBSP entre "R$" e o
// número; em JS o \s cobre esses caracteres).
const norm = (s: string) => s.replace(/\s/g, ' ')

describe('formatBRL', () => {
  it('formata número no padrão brasileiro', () => {
    expect(norm(formatBRL(1234.56))).toBe('R$ 1.234,56')
  })

  it('aceita string numérica', () => {
    expect(norm(formatBRL('10'))).toBe('R$ 10,00')
  })

  it('devolve R$ 0,00 para valor inválido', () => {
    expect(norm(formatBRL('abc'))).toBe('R$ 0,00')
  })
})

describe('parseBRL', () => {
  it('converte "R$ 1.234,56" em 1234.56', () => {
    expect(parseBRL('R$ 1.234,56')).toBe(1234.56)
  })

  it('converte "R$ 10,00" em 10', () => {
    expect(parseBRL('R$ 10,00')).toBe(10)
  })

  it('devolve 0 para string vazia', () => {
    expect(parseBRL('')).toBe(0)
  })
})
