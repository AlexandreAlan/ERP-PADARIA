/**
 * useBarcodeScanner
 *
 * Captura input de pistola de código de barras USB (tipo HID/teclado).
 * Pistolas enviam cada caractere em intervalos < 50ms e terminam com Enter.
 * Digitação manual é mais lenta (> 100ms entre teclas).
 *
 * Estratégia:
 *  - Escuta keydown globalmente em um ref de input transparente
 *  - Acumula caracteres em um buffer interno
 *  - Se o intervalo entre teclas for < SCAN_THRESHOLD, considera leitura de scanner
 *  - Ao receber Enter, dispara onScan com o código acumulado
 *  - Reseta o buffer após BUFFER_RESET_MS sem input
 */

import { useEffect, useRef, useCallback } from 'react'

const SCAN_THRESHOLD_MS = 80     // Intervalo máximo entre chars para ser scanner
const BUFFER_RESET_MS   = 500    // Reseta buffer após inatividade
const MIN_BARCODE_LEN   = 3      // Ignora leituras muito curtas

interface UseBarcodeOptions {
  onScan: (barcode: string) => void
  enabled?: boolean
}

export function useBarcodeScanner({ onScan, enabled = true }: UseBarcodeOptions) {
  const buffer      = useRef<string>('')
  const lastKeyTime = useRef<number>(0)
  const resetTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isScanning  = useRef<boolean>(false)

  const resetBuffer = useCallback(() => {
    buffer.current   = ''
    isScanning.current = false
    lastKeyTime.current = 0
  }, [])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se o foco está num input de texto que não seja o PDV
      const target = e.target as HTMLElement
      if (
        (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'hidden') ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Permite que o input PDV capture normalmente, mas ainda detecta scanner
        // se as teclas chegam muito rápidas
        const now = Date.now()
        const delta = now - lastKeyTime.current
        if (lastKeyTime.current > 0 && delta > SCAN_THRESHOLD_MS) {
          // Digitação manual num input — não interfere
          return
        }
      }

      const now   = Date.now()
      const delta = now - lastKeyTime.current

      // Reseta timer de inatividade
      if (resetTimer.current) clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(resetBuffer, BUFFER_RESET_MS)

      // Detecta Enter (fim da leitura do scanner)
      if (e.key === 'Enter' && buffer.current.length >= MIN_BARCODE_LEN) {
        e.preventDefault()
        const code = buffer.current.trim()
        resetBuffer()
        if (code) onScan(code)
        return
      }

      // Ignora teclas de controle (Shift, Ctrl, etc)
      if (e.key.length !== 1) return

      // Primeira tecla do buffer
      if (buffer.current.length === 0) {
        buffer.current   = e.key
        lastKeyTime.current = now
        return
      }

      // Teclas chegando rápido = scanner
      if (delta <= SCAN_THRESHOLD_MS) {
        isScanning.current = true
        buffer.current += e.key
      } else {
        // Intervalo longo = usuário digitando manualmente; reseta o buffer
        buffer.current   = e.key
        isScanning.current = false
      }

      lastKeyTime.current = now
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [enabled, onScan, resetBuffer])

  return { buffer }
}
