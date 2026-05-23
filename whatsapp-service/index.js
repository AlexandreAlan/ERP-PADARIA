const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const QRCode = require('qrcode')
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js')

// ── Setup ──────────────────────────────────────────────────────────────────────
const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
})

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }))
app.use(express.json())

// Media storage
const MEDIA_DIR = path.join(__dirname, 'media')
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true })
app.use('/media', express.static(MEDIA_DIR))

const upload = multer({ dest: MEDIA_DIR })

// ── State ──────────────────────────────────────────────────────────────────────
let currentQR = null
let clientStatus = 'disconnected' // 'disconnected' | 'qr' | 'ready'
let whatsappClient = null

// ── WhatsApp Client ────────────────────────────────────────────────────────────
function createClient() {
  // Resolve Chrome path — use bundled puppeteer's binary if available
  let executablePath
  try {
    executablePath = require('puppeteer').executablePath()
  } catch {
    executablePath = undefined
  }

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
    puppeteer: {
      headless: true,
      executablePath,
      timeout: 120000,
      protocolTimeout: 120000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--safebrowsing-disable-auto-update',
      ],
    },
  })

  client.on('qr', async (qr) => {
    clientStatus = 'qr'
    currentQR = await QRCode.toDataURL(qr)
    io.emit('status', { status: 'qr', qr: currentQR })
    console.log('[WA] QR Code gerado — escaneie com o celular.')
  })

  client.on('ready', () => {
    clientStatus = 'ready'
    currentQR = null
    io.emit('status', { status: 'ready' })
    console.log('[WA] Cliente pronto!')
  })

  client.on('authenticated', () => {
    console.log('[WA] Autenticado.')
  })

  client.on('auth_failure', (msg) => {
    clientStatus = 'disconnected'
    io.emit('status', { status: 'disconnected', error: msg })
    console.error('[WA] Falha na autenticação:', msg)
  })

  client.on('disconnected', (reason) => {
    clientStatus = 'disconnected'
    io.emit('status', { status: 'disconnected', reason })
    console.warn('[WA] Desconectado:', reason)
    // Re-initialize after a delay
    setTimeout(() => {
      whatsappClient = createClient()
      whatsappClient.initialize()
    }, 5000)
  })

  // Função auxiliar para montar e emitir o payload de uma mensagem
  async function emitMessage(msg) {
    try {
      let audioUrl = null

      if (msg.hasMedia && (msg.type === 'ptt' || msg.type === 'audio')) {
        try {
          const media = await msg.downloadMedia()
          if (media) {
            const ext = media.mimetype.includes('ogg') ? 'ogg' : 'mp3'
            const filename = `audio_${Date.now()}.${ext}`
            const filepath = path.join(MEDIA_DIR, filename)
            fs.writeFileSync(filepath, Buffer.from(media.data, 'base64'))
            audioUrl = `http://localhost:3001/media/${filename}`
          }
        } catch (e) {
          console.error('[WA] Erro ao baixar áudio:', e.message)
        }
      }

      let authorName = null
      try {
        const contact = await msg.getContact()
        authorName = contact.pushname || contact.number || null
      } catch (_) {
        // contato desconhecido — não bloqueia o emit
        authorName = msg.author || null
      }

      const payload = {
        id: msg.id._serialized,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        type: msg.type,
        timestamp: msg.timestamp,
        fromMe: msg.fromMe,
        hasMedia: msg.hasMedia,
        author: authorName,
        audioUrl,
      }

      io.emit('message', payload)
      console.log(`[WA] Mensagem emitida — from:${msg.from} fromMe:${msg.fromMe} type:${msg.type}`)
    } catch (e) {
      console.error('[WA] Erro ao processar mensagem:', e.message)
    }
  }

  // Mensagens recebidas
  client.on('message', (msg) => emitMessage(msg))

  // Mensagens enviadas pelo próprio usuário (para aparecerem em tempo real no frontend)
  client.on('message_create', (msg) => {
    if (msg.fromMe) emitMessage(msg)
  })

  return client
}

// Previne crash por exceções não capturadas do Puppeteer/Chrome
process.on('uncaughtException', (err) => {
  console.error('[WA] uncaughtException — reiniciando cliente em 10s:', err.message)
  clientStatus = 'disconnected'
  io.emit('status', { status: 'disconnected' })
  setTimeout(() => {
    try { whatsappClient?.destroy().catch(() => {}) } catch (_) {}
    whatsappClient = createClient()
    initializeWithRetry()
  }, 10000)
})

process.on('unhandledRejection', (reason) => {
  console.error('[WA] unhandledRejection:', reason?.message || reason)
})

async function initializeWithRetry(attempt = 1) {
  try {
    console.log(`[WA] Inicializando cliente (tentativa ${attempt})...`)
    await whatsappClient.initialize()
  } catch (err) {
    console.error(`[WA] Falha ao inicializar (tentativa ${attempt}):`, err.message || err)
    if (attempt < 5) {
      const delay = attempt * 15000
      console.log(`[WA] Tentando novamente em ${delay / 1000}s...`)
      setTimeout(() => {
        try { whatsappClient?.destroy().catch(() => {}) } catch (_) {}
        whatsappClient = createClient()
        initializeWithRetry(attempt + 1)
      }, delay)
    } else {
      console.error('[WA] Máximo de tentativas atingido. Serviço em modo degradado.')
    }
  }
}

whatsappClient = createClient()
initializeWithRetry()

// ── API Endpoints ─────────────────────────────────────────────────────────────

/**
 * Envia uma mensagem de texto simples
 * POST /send-message
 * Body: { "to": "5511999999999", "message": "Olá!" }
 */
app.post('/send-message', async (req, res) => {
  const { to, message } = req.body

  if (!whatsappClient || clientStatus !== 'ready') {
    return res.status(503).json({ error: 'WhatsApp não está conectado' })
  }

  try {
    const chatId = to.includes('@c.us') ? to : `${to}@c.us`
    await whatsappClient.sendMessage(chatId, message)
    res.json({ success: true })
  } catch (err) {
    console.error('[WA] Erro ao enviar mensagem:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * Envia um recibo com detalhes da venda
 */
app.post('/send-receipt', async (req, res) => {
  const { to, venda } = req.body

  if (!whatsappClient || clientStatus !== 'ready') {
    return res.status(503).json({ error: 'WhatsApp não está conectado' })
  }

  try {
    const chatId = to.includes('@c.us') ? to : `${to}@c.us`

    let msg = `*🍞 Padaria & Confeitaria*\n`
    msg += `--------------------------------\n`
    msg += `*RESUMO DA VENDA #${venda.id}*\n`
    msg += `Data: ${new Date(venda.created_at).toLocaleString('pt-BR')}\n\n`

    venda.itens.forEach(item => {
      msg += `• ${item.produto_nome}\n`
      msg += `  ${item.quantidade} x R$ ${item.preco_unit} = *R$ ${item.total_item}*\n`
    })

    msg += `\n--------------------------------\n`
    if (venda.desconto_valor > 0) msg += `Subtotal: R$ ${venda.subtotal}\nDesconto: R$ ${venda.desconto_valor}\n`
    msg += `*TOTAL: R$ ${venda.total}*\n`
    msg += `--------------------------------\n`
    msg += `_Obrigado pela preferência!_`

    await whatsappClient.sendMessage(chatId, msg)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


app.get('/status', (req, res) => {
  res.json({ status: clientStatus })
})

app.get('/qr', (req, res) => {
  if (!currentQR) {
    return res.status(404).json({ error: 'QR não disponível. Status: ' + clientStatus })
  }
  res.json({ qr: currentQR, status: clientStatus })
})

app.get('/contacts', async (req, res) => {
  if (clientStatus !== 'ready') {
    return res.status(503).json({ error: 'WhatsApp não conectado' })
  }
  try {
    const contacts = await whatsappClient.getContacts()
    const list = contacts
      .filter((c) => c.isMyContact && c.name)
      .map((c) => ({
        id: c.id._serialized,
        name: c.name || c.pushname || c.number,
        number: c.number,
        isGroup: c.isGroup,
        profilePicUrl: null, // avoid heavy calls
      }))
    res.json(list)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/chats', async (req, res) => {
  if (clientStatus !== 'ready') {
    return res.status(503).json({ error: 'WhatsApp não conectado' })
  }
  try {
    const chats = await whatsappClient.getChats()
    const list = await Promise.all(
      chats.slice(0, 40).map(async (chat) => {
        const lastMsg = chat.lastMessage
        return {
          id: chat.id._serialized,
          name: chat.name,
          isGroup: chat.isGroup,
          unreadCount: chat.unreadCount,
          timestamp: lastMsg ? lastMsg.timestamp : null,
          lastMessage: lastMsg
            ? {
                body: lastMsg.body,
                type: lastMsg.type,
                fromMe: lastMsg.fromMe,
                timestamp: lastMsg.timestamp,
              }
            : null,
        }
      })
    )
    // Sort by latest message
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    res.json(list)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/messages/:chatId', async (req, res) => {
  if (clientStatus !== 'ready') {
    return res.status(503).json({ error: 'WhatsApp não conectado' })
  }
  try {
    const chat = await whatsappClient.getChatById(req.params.chatId)
    const messages = await chat.fetchMessages({ limit: 50 })

    const list = await Promise.all(
      messages.map(async (msg) => {
        let audioUrl = null
        if ((msg.type === 'ptt' || msg.type === 'audio') && msg.hasMedia) {
          // Check if already cached
          const cachedFile = path.join(MEDIA_DIR, `audio_${msg.id._serialized.replace(/[^a-z0-9]/gi, '_')}.ogg`)
          if (fs.existsSync(cachedFile)) {
            audioUrl = `http://localhost:3001/media/${path.basename(cachedFile)}`
          } else {
            try {
              const media = await msg.downloadMedia()
              if (media) {
                const ext = media.mimetype.includes('ogg') ? 'ogg' : 'mp3'
                const filename = `audio_${msg.id._serialized.replace(/[^a-z0-9]/gi, '_')}.${ext}`
                const filepath = path.join(MEDIA_DIR, filename)
                fs.writeFileSync(filepath, Buffer.from(media.data, 'base64'))
                audioUrl = `http://localhost:3001/media/${filename}`
              }
            } catch (_) { /* skip */ }
          }
        }

        return {
          id: msg.id._serialized,
          body: msg.body,
          type: msg.type,
          fromMe: msg.fromMe,
          timestamp: msg.timestamp,
          author: msg.author || null,
          hasMedia: msg.hasMedia,
          audioUrl,
        }
      })
    )

    res.json(list)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/send/text', async (req, res) => {
  if (clientStatus !== 'ready') {
    return res.status(503).json({ error: 'WhatsApp não conectado' })
  }
  const { to, message } = req.body
  if (!to || !message) {
    return res.status(400).json({ error: 'Campos "to" e "message" são obrigatórios' })
  }
  try {
    const chatId = to.includes('@') ? to : `${to}@c.us`
    const sent = await whatsappClient.sendMessage(chatId, message)
    res.json({ success: true, messageId: sent.id._serialized })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/send/audio', upload.single('audio'), async (req, res) => {
  if (clientStatus !== 'ready') {
    return res.status(503).json({ error: 'WhatsApp não conectado' })
  }
  const { to } = req.body
  if (!to || !req.file) {
    return res.status(400).json({ error: 'Campos "to" e arquivo de áudio são obrigatórios' })
  }
  try {
    const chatId = to.includes('@') ? to : `${to}@c.us`
    const media = MessageMedia.fromFilePath(req.file.path)
    const sent = await whatsappClient.sendMessage(chatId, media, { sendAudioAsVoice: true })
    fs.unlinkSync(req.file.path)
    res.json({ success: true, messageId: sent.id._serialized })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── WebSocket ──────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[WS] Cliente conectado:', socket.id)
  // Send current status immediately on connect
  socket.emit('status', {
    status: clientStatus,
    qr: currentQR || undefined,
  })

  socket.on('disconnect', () => {
    console.log('[WS] Cliente desconectado:', socket.id)
  })
})

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`[WA] Serviço WhatsApp rodando em http://localhost:${PORT}`)
})
