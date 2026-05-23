import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import type { Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { api } from '@/config/api'
import AudioRecorder from '@/components/AudioRecorder'

interface WAStatus { status: 'disconnected' | 'qr' | 'ready'; qr?: string }
interface WAChat {
  id: string; name: string; isGroup: boolean; unreadCount: number; timestamp: number | null
  lastMessage: { body: string; type: string; fromMe: boolean; timestamp: number } | null
}
interface WAMessage {
  id: string; body: string; type: string; fromMe: boolean; timestamp: number
  author: string | null; hasMedia: boolean; audioUrl: string | null; from?: string; to?: string
}

const WA_WS = 'http://localhost:3001'

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatChatTime(ts: number | null) {
  if (!ts) return ''
  const d = new Date(ts * 1000), now = new Date()
  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  return isToday
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function avatarLetter(name: string) { return (name || '?')[0].toUpperCase() }

const AVATAR_HUE = [
  '#059669', '#0284C7', '#7C3AED', '#DC2626', '#D97706', '#0891B2',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return AVATAR_HUE[Math.abs(h) % AVATAR_HUE.length]
}

function StatusBadge({ status }: { status: 'disconnected' | 'qr' | 'ready' }) {
  const cfg = {
    ready:        { dot: '#16A34A', text: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', label: 'Conectado' },
    qr:           { dot: '#D97706', text: '#B45309', bg: '#FFFBEB', border: '#FDE68A', label: 'Aguardando QR' },
    disconnected: { dot: '#DC2626', text: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', label: 'Desconectado' },
  }[status]

  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </div>
  )
}

function MessageBubble({ msg }: { msg: WAMessage }) {
  const isMe = msg.fromMe
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[70%] px-3.5 py-2 text-sm shadow-sm"
        style={{
          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isMe ? '#D97706' : '#FFFFFF',
          color: isMe ? '#FFFFFF' : '#1C140D',
          border: isMe ? 'none' : '1px solid #EDE8E0',
        }}
      >
        {!isMe && msg.author && (
          <div className="text-xs font-semibold mb-0.5" style={{ color: '#D97706' }}>{msg.author}</div>
        )}
        {(msg.type === 'ptt' || msg.type === 'audio') && msg.audioUrl ? (
          <div className="flex items-center gap-2">
            <span className="text-base">🎵</span>
            <audio controls src={msg.audioUrl} className="h-8 max-w-[200px]" />
          </div>
        ) : (msg.type === 'ptt' || msg.type === 'audio') ? (
          <div className="flex items-center gap-1.5" style={{ color: isMe ? 'rgba(255,255,255,0.7)' : '#B0A090' }}>
            <span>🎵</span><span className="italic text-xs">Áudio</span>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
        )}
        <div className="text-right text-[10px] mt-1" style={{ color: isMe ? 'rgba(255,255,255,0.65)' : '#B0A090' }}>
          {formatTime(msg.timestamp)}
        </div>
      </div>
    </div>
  )
}

export default function WhatsappPage() {
  const queryClient = useQueryClient()
  const [activeChat, setActiveChat]     = useState<WAChat | null>(null)
  const [search, setSearch]             = useState('')
  const [text, setText]                 = useState('')
  const [showQR, setShowQR]             = useState(false)
  const [liveStatus, setLiveStatus]     = useState<WAStatus | null>(null)
  const [liveMessages, setLiveMessages] = useState<WAMessage[]>([])
  const bottomRef    = useRef<HTMLDivElement>(null)
  const socketRef    = useRef<Socket | null>(null)
  const activeChatRef = useRef<WAChat | null>(null)
  useEffect(() => { activeChatRef.current = activeChat }, [activeChat])

  const { data: statusData } = useQuery<WAStatus>('wa-status', () => api.get('/whatsapp/status').then(r => r.data), { refetchInterval: 5000 })
  const { data: chats = [] } = useQuery<WAChat[]>('wa-chats', () => api.get('/whatsapp/chats').then(r => r.data), { enabled: (liveStatus?.status ?? statusData?.status) === 'ready', refetchInterval: 15000 })
  const { data: messages = [], isLoading: loadingMsgs } = useQuery<WAMessage[]>(
    ['wa-messages', activeChat?.id],
    () => api.get(`/whatsapp/messages/${activeChat!.id}`).then(r => r.data),
    { enabled: !!activeChat, onSuccess: () => setLiveMessages([]) }
  )
  const { data: qrData } = useQuery<{ qr: string }>('wa-qr', () => api.get('/whatsapp/qr').then(r => r.data), { enabled: (liveStatus?.status ?? statusData?.status) === 'qr', refetchInterval: 20000 })

  useEffect(() => {
    let socket: Socket | null = null
    import('socket.io-client').then(({ io }) => {
      socket = io(WA_WS, { transports: ['websocket'] })
      socketRef.current = socket
      socket.on('status', (data: WAStatus) => {
        setLiveStatus(data)
        if (data.status === 'ready') { queryClient.invalidateQueries('wa-chats'); setShowQR(false) }
        if (data.status === 'qr') { setShowQR(true); queryClient.invalidateQueries('wa-qr') }
      })
      socket.on('message', (msg: WAMessage) => {
        const ac = activeChatRef.current
        if (ac && (msg.from === ac.id || msg.to === ac.id)) setLiveMessages(prev => [...prev, msg])
        queryClient.invalidateQueries('wa-chats')
      })
    }).catch(() => {})
    return () => { socket?.disconnect() }
  }, []) // eslint-disable-line

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, liveMessages])

  const sendText = useMutation(
    (payload: { to: string; message: string }) => api.post('/whatsapp/send/text', payload),
    { onSuccess: () => { setText(''); if (activeChat) queryClient.invalidateQueries(['wa-messages', activeChat.id]) },
      onError: () => { toast.error('Erro ao enviar mensagem') } }
  )
  const sendAudio = useMutation(
    (blob: Blob) => {
      const fd = new FormData()
      fd.append('to', activeChat!.id); fd.append('audio', blob, 'audio.webm')
      return api.post('/whatsapp/send/audio', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    { onSuccess: () => { if (activeChat) queryClient.invalidateQueries(['wa-messages', activeChat.id]) },
      onError: () => { toast.error('Erro ao enviar áudio') } }
  )

  const currentStatus = liveStatus?.status ?? statusData?.status ?? 'disconnected'
  const currentQR     = liveStatus?.qr ?? qrData?.qr
  const filteredChats = chats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  const allMessages   = [...messages, ...liveMessages.filter(lm => activeChat && (lm.from === activeChat.id || lm.to === activeChat.id))]

  const handleSend = () => { if (!text.trim() || !activeChat) return; sendText.mutate({ to: activeChat.id, message: text.trim() }) }
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }

  return (
    <div className="flex h-full rounded-xl overflow-hidden" style={{ border: '1px solid #EDE8E0', background: '#FFFFFF' }}>

      {/* QR Modal */}
      {showQR && currentQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-5 max-w-sm w-full mx-4 shadow-2xl" style={{ border: '1px solid #EDE8E0' }}>
            <div className="font-display font-bold text-lg" style={{ color: '#1C140D' }}>Conectar WhatsApp</div>
            <p className="text-sm text-center" style={{ color: '#8A7A6A' }}>
              Abra o WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo
            </p>
            <div className="bg-white p-2 rounded-xl" style={{ border: '1px solid #EDE8E0' }}>
              <img src={currentQR} alt="QR Code WhatsApp" className="w-56 h-56" />
            </div>
            <p className="text-xs" style={{ color: '#B0A090' }}>O QR atualiza automaticamente</p>
            <button onClick={() => setShowQR(false)} className="text-sm transition-colors" style={{ color: '#B0A090' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#1C140D')}
              onMouseLeave={e => (e.currentTarget.style.color = '#B0A090')}>Fechar</button>
          </div>
        </div>
      )}

      {/* Lista de chats */}
      <div className="w-72 shrink-0 flex flex-col" style={{ borderRight: '1px solid #EDE8E0' }}>
        <div className="p-4 space-y-3" style={{ borderBottom: '1px solid #F3EDE3', background: '#FAFAF7' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <span className="font-display font-bold text-base" style={{ color: '#1C140D' }}>WhatsApp</span>
            </div>
            <StatusBadge status={currentStatus} />
          </div>

          {currentStatus !== 'ready' && (
            <button onClick={() => setShowQR(true)} className="w-full btn-success py-1.5 text-xs justify-center">
              {currentStatus === 'qr' ? '📱 Escanear QR Code' : '🔌 Conectar WhatsApp'}
            </button>
          )}

          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="#B0A090" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Buscar conversa..." value={search} onChange={e => setSearch(e.target.value)}
              className="input text-xs pl-8 py-2" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {currentStatus !== 'ready' ? (
            <div className="p-6 text-center text-sm" style={{ color: '#B0A090' }}>
              Conecte o WhatsApp para ver as conversas
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-6 text-center text-sm" style={{ color: '#B0A090' }}>Nenhuma conversa encontrada</div>
          ) : (
            filteredChats.map(chat => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  borderBottom: '1px solid #F3EDE3',
                  background: activeChat?.id === chat.id ? '#FFFBEB' : 'transparent',
                  borderLeft: activeChat?.id === chat.id ? '3px solid #D97706' : '3px solid transparent',
                }}
                onMouseEnter={e => { if (activeChat?.id !== chat.id) e.currentTarget.style.background = '#FAFAF7' }}
                onMouseLeave={e => { if (activeChat?.id !== chat.id) e.currentTarget.style.background = 'transparent' }}
              >
                <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-semibold text-sm"
                  style={{ background: avatarColor(chat.name) }}>
                  {chat.isGroup ? '👥' : avatarLetter(chat.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold truncate" style={{ color: '#1C140D' }}>{chat.name}</span>
                    <span className="text-[10px] shrink-0" style={{ color: '#B0A090' }}>{formatChatTime(chat.timestamp)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="text-xs truncate" style={{ color: '#8A7A6A' }}>
                      {chat.lastMessage
                        ? (chat.lastMessage.type === 'ptt' || chat.lastMessage.type === 'audio') ? '🎵 Áudio' : chat.lastMessage.body || '...'
                        : ''}
                    </span>
                    {chat.unreadCount > 0 && (
                      <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: '#D97706' }}>
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

      {/* Conversa */}
      {activeChat ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header da conversa */}
          <div className="flex items-center gap-3 px-5 py-3.5 shrink-0" style={{ borderBottom: '1px solid #EDE8E0', background: '#FAFAF7' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ background: avatarColor(activeChat.name) }}>
              {activeChat.isGroup ? '👥' : avatarLetter(activeChat.name)}
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: '#1C140D' }}>{activeChat.name}</div>
              {activeChat.isGroup && <div className="text-xs" style={{ color: '#B0A090' }}>Grupo</div>}
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2"
            style={{ background: '#FAF6F0', backgroundImage: 'radial-gradient(circle, rgba(180,83,9,0.04) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            {loadingMsgs ? (
              <div className="flex justify-center pt-10">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D97706', borderTopColor: 'transparent' }} />
              </div>
            ) : allMessages.length === 0 ? (
              <div className="text-center text-sm pt-10" style={{ color: '#D4C9B8' }}>Nenhuma mensagem</div>
            ) : allMessages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 px-4 py-3 shrink-0" style={{ borderTop: '1px solid #EDE8E0', background: '#FFFFFF' }}>
            <AudioRecorder onRecorded={blob => sendAudio.mutate(blob)} disabled={sendAudio.isLoading} />
            <textarea
              rows={1}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mensagem..."
              className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm focus:outline-none max-h-32"
              style={{ background: '#FAFAF7', border: '1.5px solid #E8DDD0', color: '#1C140D', lineHeight: '1.4', transition: 'border-color 0.15s' }}
              onFocus={e => (e.target.style.borderColor = '#D97706')}
              onBlur={e => (e.target.style.borderColor = '#E8DDD0')}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sendText.isLoading}
              className="p-2.5 rounded-xl transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(217,119,6,0.3)' }}
            >
              {sendText.isLoading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
              }
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ background: '#FAF6F0' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', border: '1px solid #FCD34D' }}>💬</div>
          <div className="font-display font-bold text-base" style={{ color: '#1C140D' }}>Selecione uma conversa</div>
          <div className="text-sm" style={{ color: '#B0A090' }}>
            {currentStatus === 'ready' ? 'Escolha um chat na lista ao lado' : 'Conecte o WhatsApp primeiro'}
          </div>
        </div>
      )}
    </div>
  )
}
