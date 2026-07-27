import { defineConfig } from 'vitest/config'

// Testes de lógica pura (utils e stores) — não precisam de DOM, então
// rodam no ambiente node, rápido. Componentes React ficam pra uma fase
// posterior (exigiriam jsdom + testing-library).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
