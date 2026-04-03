export function formatBRL(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(num)
}

export function parseBRL(value: string): number {
  // "R$ 1.234,56" → 1234.56
  return parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0
}
