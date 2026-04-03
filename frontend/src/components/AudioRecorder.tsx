import { useRef, useState } from 'react'

interface Props {
  onRecorded: (blob: Blob) => void
  disabled?: boolean
}

type RecorderState = 'idle' | 'recording' | 'done'

export default function AudioRecorder({ onRecorded, disabled }: Props) {
  const [state, setState] = useState<RecorderState>('idle')
  const [seconds, setSeconds] = useState(0)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onRecorded(blob)
        stream.getTracks().forEach((t) => t.stop())
        setState('done')
        if (timerRef.current) clearInterval(timerRef.current)
        setTimeout(() => setState('idle'), 1500)
      }

      recorder.start()
      mediaRef.current = recorder
      setState('recording')
      setSeconds(0)

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s >= 120) {
            stopRecording()
            return s
          }
          return s + 1
        })
      }, 1000)
    } catch {
      alert('Permissão de microfone negada.')
    }
  }

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state === 'recording') {
      mediaRef.current.stop()
    }
  }

  if (state === 'recording') {
    return (
      <button
        type="button"
        onClick={stopRecording}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
        title="Parar gravação"
      >
        <span className="w-2.5 h-2.5 rounded-sm bg-white animate-pulse" />
        {seconds}s
      </button>
    )
  }

  if (state === 'done') {
    return (
      <button
        type="button"
        disabled
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-700 text-white text-sm"
      >
        ✓ Enviando…
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-40"
      title="Gravar áudio"
    >
      🎙
    </button>
  )
}
