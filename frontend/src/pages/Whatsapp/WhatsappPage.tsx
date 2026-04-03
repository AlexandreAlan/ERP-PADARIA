import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import type { Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import AudioRecorder from '@/components/AudioRecorder'

// ── Types ──────────────────────────────────────────────────────────────────────

interface WAStatus {
  status: 'disconnected' | 'qr' | 'ready'
  qr?: string
}

interface WAChat {
  id: string
  name: string
  isGroup: boolean
  unreadCount: number
  timestamp: number | null
  lastMessage: {
    body: string
    type: string
    fromMe: boolean
    timestamp: number
  } | null
}

interface WAMessage {
  id: string
  body: string
  type: string
  fromMe: boolean
  timestamp: number
  author: string | null
  hasMedia: boolean
  audioUrl: string | null
  from?: string
  to?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const WA_WS = 'http://localhost:3001'

function formatTime(ts: number) {
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatChatTime(ts: number | null) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  if (isToday) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function avatarLetter(name: string) {
  return (name || '?')[0].toUpperCase()
}

const AVATAR_COLORS = [
  'bg-emerald-600', 'bg-sky-600', 'bg-violet-600',
  'bg-rose-600', 'bg-amber-600', 'bg-teal-600',
]

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

// ── Sub-components (top-level para React Fast Refresh) ─────────────────────────

function StatusBadge({ currentStatus }: { currentStatus: 'disconnected' | 'qr' | 'ready' }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span
        className={`w-2 h-2 rounded-full ${
          currentStatus === 'ready'
            ? 'bg-green-400'
            : currentStatus === 'qr'
            ? 'bg-yellow-400 animate-pulse'
            : 'bg-red-500'
        }`}
      />
      <span
        className={
          currentStatus === 'ready'
            ? 'text-green-400'
            : currentStatus === 'qr'
            ? 'text-yellow-400'
            : 'text-red-400'
        }
      >
        {currentStatus === 'ready'
          ? 'Conectado'
          : currentStatus === 'qr'
          ? 'Aguardando QR'
          : 'Desconectado'}
      </span>
    </div>
  )
}

function MessageBubble({ msg }: { msg: WAMessage }) {
  const isMe = msg.fromMe
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow ${
          isMe
            ? 'bg-green-700 text-white rounded-br-sm'
            : 'bg-gray-800 text-gray-100 rounded-bl-sm'
        }`}
      >
        {!isMe && msg.author && (
          <div className="text-xs font-semibold text-green-400 mb-0.5">{msg.author}</div>
        )}
        {(msg.type === 'ptt' || msg.type === 'audio') && msg.audioUrl ? (
          <div className="flex items-center gap-2">
            <span className="text-base">🎵</span>
            <audio
              controls
              src={msg.audioUrl}
              className="h-8 max-w-[200px]"
              style={{ filter: 'invert(0.2)' }}
            />
          </div>
        ) : (msg.type === 'ptt' || msg.type === 'audio') ? (
          <div className="flex items-center gap-1.5 text-gray-400">
            <span>🎵</span>
            <span className="italic text-xs">Áudio</span>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
        )}
        <div className={`text-right text-[10px] mt-1 ${isMe ? 'text-green-200/70' : 'text-gray-500'}`}>
          {formatTime(msg.timestamp)}
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function WhatsappPage() {
  const queryClient = useQueryClient()
  const [activeChat, setActiveChat] = useState<WAChat | null>(null)
  const [search, setSearch] = useState('')
  const [text, setText] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [liveStatus, setLiveStatus] = useState<WAStatus | null>(null)
  const [liveMessages, setLiveMessages] = useState<WAMessage[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)
  // Ref para que o handler do socket sempre acesse o activeChat atual (sem closure stale)
  const activeChatRef = useRef<WAChat | null>(null)
  useEffect(() => { activeChatRef.current = activeChat }, [activeChat])

  // ── Backend queries (via FastAPI proxy) ──────────────────────────────────────

  const { data: statusData } = useQuery<WAStatus>(
    'wa-status',
    () => api.get('/whatsapp/status').then((r) => r.data),
    { refetchInterval: 5000 }
  )

  const { data: chats = [] } = useQuery<WAChat[]>(
    'wa-chats',
    () => api.get('/whatsapp/chats').then((r) => r.data),
    { enabled: (liveStatus?.status ?? statusData?.status) === 'ready', refetchInterval: 15000 }
  )

  const { data: messages = [], isLoading: loadingMsgs } = useQuery<WAMessage[]>(
    ['wa-messages', activeChat?.id],
    () => api.get(`/whatsapp/messages/${activeChat!.id}`).then((r) => r.data),
    {
      enabled: !!activeChat,
      // Limpa mensagens live ao carregar o histórico (evita duplicatas)
      onSuccess: () => setLiveMessages([]),
    }
  )

  const { data: qrData } = useQuery<{ qr: string }>(
    'wa-qr',
    () => api.get('/whatsapp/qr').then((r) => r.data),
    { enabled: (liveStatus?.status ?? statusData?.status) === 'qr', refetchInterval: 20000 }
  )

  // ── WebSocket — import dinâmico para evitar problemas de init estático ────────

  useEffect(() => {
    let socket: Socket | null = null

    import('socket.io-client').then(({ io }) => {
      socket = io(WA_WS, { transports: ['websocket'] })
      socketRef.current = socket

      socket.on('status', (data: WAStatus) => {
        setLiveStatus(data)
        if (data.status === 'ready') {
          queryClient.invalidateQueries('wa-chats')
          setShowQR(false)
        }
        if (data.status === 'qr') {
          setShowQR(true)
          queryClient.invalidateQueries('wa-qr')
        }
      })

      socket.on('message', (msg: WAMessage) => {
        const ac = activeChatRef.current
        // Adiciona na lista live se pertence ao chat ativo
        if (ac && (msg.from === ac.id || msg.to === ac.id)) {
          setLiveMessages((prev) => [...prev, msg])
        }
        // Sempre atualiza a lista de chats (badge de não lido, última mensagem)
        queryClient.invalidateQueries('wa-chats')
      })
    }).catch(() => {
      // WhatsApp service not available — silently ignore
    })

    return () => {
      socket?.disconnect()
    }
  }, []) // eslint-disable-line

  // ── Scroll to bottom on new messages ────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, liveMessages])

  // ── Mutations ────────────────────────────────────────────────────────────────

  const sendText = useMutation(
    (payload: { to: string; message: string }) =>
      api.post('/whatsapp/send/text', payload),
    {
      onSuccess: () => {
        setText('')
        if (activeChat) queryClient.invalidateQueries(['wa-messages', activeChat.id])
      },
      onError: () => { toast.error('Erro ao enviar mensagem') },
    }
  )

  const sendAudio = useMutation(
    (blob: Blob) => {
      const fd = new FormData()
      fd.append('to', activeChat!.id)
      fd.append('audio', blob, 'audio.webm')
      return api.post('/whatsapp/send/audio', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    {
      onSuccess: () => {
        if (activeChat) queryClient.invalidateQueries(['wa-messages', activeChat.id])
      },
      onError: () => { toast.error('Erro ao enviar áudio') },
    }
  )

  // ── Derived state ────────────────────────────────────────────────────────────

  const currentStatus = liveStatus?.status ?? statusData?.status ?? 'disconnected'
  const currentQR = liveStatus?.qr ?? qrData?.qr

  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const allMessages = [
    ...messages,
    ...liveMessages.filter(
      (lm) => activeChat && (lm.from === activeChat.id || lm.to === activeChat.id)
    ),
  ]

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSend = () => {
    if (!text.trim() || !activeChat) return
    sendText.mutate({ to: activeChat.id, message: text.trim() })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-gray-950 rounded-xl overflow-hidden border border-gray-800">
      {/* ── QR Modal ── */}
      {showQR && currentQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 flex flex-col items-center gap-5 max-w-sm w-full mx-4">
            <div className="text-lg font-semibold text-white">Conectar WhatsApp</div>
            <p className="text-sm text-gray-400 text-center">
              Abra o WhatsApp no seu celular → Menu → Dispositivos conectados → Conectar dispositivo
            </p>
            <div className="bg-white p-3 rounded-xl">
              <img src={currentQR} alt="QR Code WhatsApp" className="w-56 h-56" />
            </div>
            <p className="text-xs text-gray-500">O QR atualiza automaticamente</p>
            <button
              onClick={() => setShowQR(false)}
              className="text-sm text-gray-400 hover:text-gray-200"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ── Coluna esquerda: lista de chats ── */}
      <div className="w-80 shrink-0 flex flex-col border-r border-gray-800 bg-gray-900">
        <div className="p-4 border-b border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold text-white flex items-center gap-2">
              💬 WhatsApp
            </div>
            <StatusBadge currentStatus={currentStatus} />
          </div>

          {currentStatus !== 'ready' && (
            <button
              onClick={() => setShowQR(true)}
              className="w-full text-sm py-1.5 px-3 rounded-lg bg-green-700 hover:bg-green-600 text-white transition-colors"
            >
              {currentStatus === 'qr' ? '📱 Escanear QR Code' : '🔌 Conectar'}
            </button>
          )}

          <input
            type="text"
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-600"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {currentStatus !== 'ready' ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Conecte o WhatsApp para ver as conversas
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">Nenhuma conversa encontrada</div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-800/50 ${
                  activeChat?.id === chat.id ? 'bg-gray-700' : 'hover:bg-gray-800'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-semibold text-sm ${avatarColor(chat.name)}`}
                >
                  {chat.isGroup ? '👥' : avatarLetter(chat.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium text-white truncate">{chat.name}</span>
                    <span className="text-xs text-gray-500 shrink-0">
                      {formatChatTime(chat.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="text-xs text-gray-400 truncate">
                      {chat.lastMessage
                        ? chat.lastMessage.type === 'ptt' || chat.lastMessage.type === 'audio'
                          ? '🎵 Áudio'
                          : chat.lastMessage.body || '...'
                        : ''}
                    </span>
                    {chat.unreadCount > 0 && (
                      <span className="shrink-0 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                        {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Coluna central: conversa ── */}
      {activeChat ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-800 bg-gray-900 shrink-0">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold ${avatarColor(activeChat.name)}`}
            >
              {activeChat.isGroup ? '👥' : avatarLetter(activeChat.name)}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{activeChat.name}</div>
              {activeChat.isGroup && <div className="text-xs text-gray-500">Grupo</div>}
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto px-5 py-4 space-y-2"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)`,
              backgroundSize: '28px 28px',
            }}
          >
            {loadingMsgs ? (
              <div className="flex justify-center pt-10">
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : allMessages.length === 0 ? (
              <div className="text-center text-sm text-gray-600 pt-10">Nenhuma mensagem</div>
            ) : (
              allMessages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-end gap-2 px-4 py-3 border-t border-gray-800 bg-gray-900 shrink-0">
            <AudioRecorder
              onRecorded={(blob) => sendAudio.mutate(blob)}
              disabled={sendAudio.isLoading}
            />
            <textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mensagem..."
              className="flex-1 resize-none bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-600 max-h-32"
              style={{ lineHeight: '1.4' }}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sendText.isLoading}
              className="p-2.5 rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              title="Enviar"
            >
              {sendText.isLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-3">
          <div className="text-5xl">💬</div>
          <div className="text-base font-medium text-gray-500">Selecione uma conversa</div>
          <div className="text-sm text-gray-600">
            {currentStatus === 'ready'
              ? 'Escolha um chat na lista ao lado'
              : 'Conecte o WhatsApp primeiro'}
          </div>
        </div>
      )}
    </div>
  )
}
