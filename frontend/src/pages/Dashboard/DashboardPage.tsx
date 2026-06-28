import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from 'react-query'
import { format, subDays, parseISO, differenceInCalendarDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '@/config/api'
import { formatBRL } from '@/utils/currency'
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter'

const PERIODOS = [
  { label: 'Hoje',    days: 0  },
  { label: '7 dias',  days: 7  },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
]

const isoToday = () => format(new Date(), 'yyyy-MM-dd')
const isoMinusDays = (d: number) => format(subDays(new Date(), d), 'yyyy-MM-dd')

// ── Trend badge ────────────────────────────────────────────────────────────────

function TrendBadge({ trend }: { trend: number }) {
  const up = trend >= 0
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md"
      style={{ background: up ? '#F0FDF4' : '#FEF2F2', color: up ? '#16A34A' : '#B91C1C' }}
    >
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
        {up ? <path d="M8 3l5 5H3l5-5z" /> : <path d="M8 13l5-5H3l5 5z" />}
      </svg>
      {Math.abs(trend).toFixed(1)}%
    </span>
  )
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({
  label, rawValue, fmt, accentColor, icon, delay = 0, trend, featured = false
}: {
  label: string; rawValue: number; fmt: 'brl' | 'pct' | 'num'
  accentColor: string; icon: React.ReactNode; delay?: number
  trend?: number; featured?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const animated = useAnimatedCounter(visible ? rawValue : 0, 900)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay, rawValue])

  const display = fmt === 'brl' ? formatBRL(animated)
               : fmt === 'pct' ? `${animated.toFixed(1)}%`
               : String(Math.round(animated))

  return (
    <div
      className="bg-white rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden"
      style={{
        border: '1px solid var(--clr-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s, transform 0.18s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
        el.style.transform = 'translateY(0)'
      }}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: accentColor }} />

      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: accentColor + '18', color: accentColor }}
        >
          {icon}
        </div>
        {trend !== undefined && <TrendBadge trend={trend} />}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--clr-text-muted)' }}>
          {label}
        </p>
        <p className={`font-mono font-black truncate ${featured ? 'text-2xl' : 'text-xl'}`}
          style={{ color: 'var(--clr-text)' }}
        >
          {display}
        </p>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid var(--clr-border)' }}>
      <div className="w-9 h-9 rounded-xl mb-3" style={{ background: 'var(--clr-bg)', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
      <div className="h-3 rounded mb-2 w-20" style={{ background: 'var(--clr-bg)', animation: 'skeletonPulse 1.4s ease-in-out 0.1s infinite' }} />
      <div className="h-6 rounded w-28" style={{ background: 'var(--clr-bg)', animation: 'skeletonPulse 1.4s ease-in-out 0.2s infinite' }} />
    </div>
  )
}

// ── KPI config ─────────────────────────────────────────────────────────────────

const KPI_FINANCIAL = [
  {
    key: 'faturamento_bruto',   label: 'Faturamento Bruto',  fmt: 'brl' as const,
    accent: '#16A34A', featured: true,
    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  },
  {
    key: 'faturamento_liquido', label: 'Fat. Líquido',        fmt: 'brl' as const,
    accent: '#2563EB',
    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg>,
  },
  {
    key: 'lucro_bruto',         label: 'Lucro Bruto',         fmt: 'brl' as const,
    accent: '#059669',
    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>,
  },
  {
    key: 'margem_media',        label: 'Margem Média',        fmt: 'pct' as const,
    accent: '#7C3AED',
    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M9 14.25l6-6M9.75 9.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm8.25 6a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>,
  },
]

const KPI_OPERATIONAL = [
  {
    key: 'quantidade_vendas',   label: 'Qtd. Vendas',         fmt: 'num' as const,
    accent: '#0891B2',
    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/></svg>,
  },
  {
    key: 'ticket_medio',        label: 'Ticket Médio',        fmt: 'brl' as const,
    accent: '#D97706',
    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 6v.75a3.375 3.375 0 01-3.375 3.375h-1.5a3.375 3.375 0 01-3.375-3.375V6m10.5 0a2.25 2.25 0 00-2.25-2.25h-6A2.25 2.25 0 007.5 6m9 0h-9M3.75 21h16.5M5.625 15h12.75M3.75 17.25h16.5"/></svg>,
  },
  {
    key: 'custo_total',         label: 'Custo Total',         fmt: 'brl' as const,
    accent: '#DC2626',
    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181"/></svg>,
  },
  {
    key: 'itens_vendidos',      label: 'Itens Vendidos',      fmt: 'num' as const,
    accent: '#64748B',
    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/></svg>,
  },
]

// ── Chart tooltip ──────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 shadow-xl text-sm" style={{ background: '#fff', border: '1px solid var(--clr-border)' }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--clr-text-muted)', fontSize: 11 }}>
        {format(new Date(label + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR })}
      </p>
      <p className="font-mono font-bold text-base" style={{ color: '#16A34A' }}>
        {formatBRL(payload[0].value)}
      </p>
    </div>
  )
}

// ── Participation bar ──────────────────────────────────────────────────────────

function ParticipationBar({ pct, classe }: { pct: number; classe: string }) {
  const [width, setWidth] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        requestAnimationFrame(() => setTimeout(() => setWidth(pct), 80))
        observer.disconnect()
      }
    }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [pct])

  const color = classe === 'A' ? '#16A34A' : classe === 'B' ? '#D97706' : '#94A3B8'

  return (
    <div ref={ref} className="w-full h-1.5 rounded-full" style={{ background: 'var(--clr-bg)' }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${width}%`, background: color, transition: 'width 0.8s cubic-bezier(0.22,0.61,0.36,1)', maxWidth: '100%' }}
      />
    </div>
  )
}

// ── Stock mini bar ─────────────────────────────────────────────────────────────

function StockMiniBar({ atual, minimo }: { atual: number; minimo: number }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const max = Math.max(minimo * 4, atual * 1.2, 1)
    const pct = Math.min((atual / max) * 100, 100)
    const t = setTimeout(() => setWidth(pct), 100)
    return () => clearTimeout(t)
  }, [atual, minimo])

  const cor = atual <= 0 ? '#DC2626' : atual <= minimo ? '#F59E0B' : '#40916C'

  return (
    <div className="w-full h-1 rounded-full" style={{ background: 'var(--clr-bg)' }}>
      <div className="h-full rounded-full" style={{ width: `${width}%`, background: cor, transition: 'width 0.7s cubic-bezier(0.22,0.61,0.36,1)' }} />
    </div>
  )
}

const fmtQtd = (v: string | number) => String(parseFloat(String(v)))

const RANK_STYLE = [
  { bg: '#FEF9C3', color: '#92400E', label: '🥇' },
  { bg: '#F1F5F9', color: '#475569', label: '🥈' },
  { bg: '#FFF7ED', color: '#9A3412', label: '🥉' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [dataInicio, setDataInicio] = useState(() => isoMinusDays(7))
  const [dataFim, setDataFim]       = useState(() => isoToday())
  const [customOpen, setCustomOpen] = useState(false)
  const customRef = useRef<HTMLDivElement | null>(null)

  const presetAtivo = useMemo(() => {
    if (dataFim !== isoToday()) return null
    const diff = differenceInCalendarDays(parseISO(dataFim), parseISO(dataInicio))
    const match = PERIODOS.find(p => p.days === diff)
    return match ? match.days : null
  }, [dataInicio, dataFim])

  const aplicarPreset = (days: number) => {
    setDataFim(isoToday())
    setDataInicio(isoMinusDays(days))
    setCustomOpen(false)
  }

  useEffect(() => {
    if (!customOpen) return
    const onClick = (e: MouseEvent) => {
      if (customRef.current && !customRef.current.contains(e.target as Node)) setCustomOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [customOpen])

  const { data, isLoading } = useQuery(
    ['dashboard', dataInicio, dataFim],
    () => api.get(`/dashboard?data_inicio=${dataInicio}&data_fim=${dataFim}`).then(r => r.data),
    { refetchInterval: 60_000, enabled: !!dataInicio && !!dataFim && dataInicio <= dataFim }
  )

  const kpis       = data?.kpis
  const vendasDia  = data?.vendas_por_dia  || []
  const alertas    = data?.alertas_estoque || []
  const abc        = data?.curva_abc       || []
  const maquinetas = data?.maquinetas      || []

  const salesTrend = useMemo(() => {
    if (!vendasDia || vendasDia.length < 2) return undefined
    const mid = Math.floor(vendasDia.length / 2)
    const a = vendasDia.slice(0, mid).reduce((s: number, d: any) => s + (d.total_vendas || 0), 0)
    const b = vendasDia.slice(mid).reduce((s: number, d: any) => s + (d.total_vendas || 0), 0)
    if (a === 0) return undefined
    return ((b - a) / a) * 100
  }, [vendasDia])

  const allKpis = [...KPI_FINANCIAL, ...KPI_OPERATIONAL]

  return (
    <div className="p-5 lg:p-6 space-y-6" style={{ background: 'var(--clr-bg)', minHeight: '100vh' }}>

      <style>{`
        @keyframes skeletonPulse { 0%,100%{opacity:1} 50%{opacity:.45} }
      `}</style>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--clr-text)' }}>Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })} · atualiza a cada minuto
          </p>
        </div>
        <div className="flex p-1 rounded-xl gap-0.5 relative" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
          {PERIODOS.map(p => (
            <button
              key={p.days}
              onClick={() => aplicarPreset(p.days)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={presetAtivo === p.days
                ? { background: 'var(--clr-green)', color: '#fff', boxShadow: '0 2px 8px rgba(45,106,79,0.3)' }
                : { color: 'var(--clr-text-muted)' }
              }
              onMouseEnter={e => { if (presetAtivo !== p.days) (e.currentTarget as HTMLElement).style.background = 'var(--clr-green-pale)' }}
              onMouseLeave={e => { if (presetAtivo !== p.days) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {p.label}
            </button>
          ))}

          <div ref={customRef} className="relative">
            <button
              onClick={() => setCustomOpen(v => !v)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all inline-flex items-center gap-1"
              style={presetAtivo === null
                ? { background: 'var(--clr-green)', color: '#fff', boxShadow: '0 2px 8px rgba(45,106,79,0.3)' }
                : { color: 'var(--clr-text-muted)' }
              }
              onMouseEnter={e => { if (presetAtivo !== null) return; }}
              title="Selecionar período personalizado"
            >
              {presetAtivo === null
                ? `${format(parseISO(dataInicio), 'dd/MM/yy')} – ${format(parseISO(dataFim), 'dd/MM/yy')}`
                : 'Personalizado'}
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2 4l4 4 4-4z" />
              </svg>
            </button>

            {customOpen && (
              <div
                className="absolute right-0 mt-2 p-3 rounded-xl shadow-lg z-20 flex flex-col gap-2"
                style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', minWidth: 240 }}
              >
                <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>
                  De
                  <input
                    type="date"
                    value={dataInicio}
                    max={dataFim}
                    onChange={e => setDataInicio(e.target.value)}
                    className="px-2 py-1.5 rounded-md text-sm font-normal"
                    style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)', color: 'var(--clr-text)' }}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>
                  Até
                  <input
                    type="date"
                    value={dataFim}
                    min={dataInicio}
                    max={isoToday()}
                    onChange={e => setDataFim(e.target.value)}
                    className="px-2 py-1.5 rounded-md text-sm font-normal"
                    style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)', color: 'var(--clr-text)' }}
                  />
                </label>
                <button
                  onClick={() => setCustomOpen(false)}
                  className="mt-1 px-3 py-1.5 rounded-md text-sm font-semibold"
                  style={{ background: 'var(--clr-green)', color: '#fff' }}
                >
                  Aplicar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── KPIs Financeiros ── */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2.5 px-0.5" style={{ color: 'var(--clr-text-muted)' }}>
          Financeiro
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {KPI_FINANCIAL.map((cfg, i) => (
            isLoading ? <SkeletonCard key={cfg.key} /> : (
              <KpiCard
                key={cfg.key}
                label={cfg.label}
                rawValue={kpis ? parseFloat(kpis[cfg.key]) || 0 : 0}
                fmt={cfg.fmt}
                accentColor={cfg.accent}
                icon={cfg.icon}
                delay={i * 55}
                featured={(cfg as any).featured}
                trend={['faturamento_bruto','faturamento_liquido','lucro_bruto'].includes(cfg.key) ? salesTrend : undefined}
              />
            )
          ))}
        </div>
      </div>

      {/* ── KPIs Operacionais ── */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2.5 px-0.5" style={{ color: 'var(--clr-text-muted)' }}>
          Operacional
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {KPI_OPERATIONAL.map((cfg, i) => (
            isLoading ? <SkeletonCard key={cfg.key} /> : (
              <KpiCard
                key={cfg.key}
                label={cfg.label}
                rawValue={kpis ? parseFloat(kpis[cfg.key]) || 0 : 0}
                fmt={cfg.fmt}
                accentColor={cfg.accent}
                icon={cfg.icon}
                delay={220 + i * 55}
              />
            )
          ))}
        </div>
      </div>

      {/* ── Maquinetas ── */}
      {(isLoading || maquinetas.length > 0) && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2.5 px-0.5" style={{ color: 'var(--clr-text-muted)' }}>
            Recebimentos por Maquineta
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {isLoading ? (
              [1,2,3,4].map(i => <SkeletonCard key={i} />)
            ) : (
              maquinetas.map((m: any) => (
                <div
                  key={m.maquineta}
                  className="bg-white rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden"
                  style={{ border: '1px solid var(--clr-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: '#0891B2' }} />
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: '#0891B218', color: '#0891B2' }}>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md"
                      style={{ background: '#E0F2FE', color: '#0369A1' }}>
                      Maq. {m.maquineta}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--clr-text-muted)' }}>
                      Total
                    </p>
                    <p className="font-mono font-black text-xl truncate" style={{ color: 'var(--clr-text)' }}>
                      {formatBRL(parseFloat(m.total))}
                    </p>
                  </div>
                  <div className="flex gap-3 pt-1" style={{ borderTop: '1px solid var(--clr-border)' }}>
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#1D4ED8' }}>Crédito</p>
                      <p className="font-mono font-bold text-sm" style={{ color: '#1D4ED8' }}>{formatBRL(parseFloat(m.credito))}</p>
                    </div>
                    <div className="w-px" style={{ background: 'var(--clr-border)' }} />
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#6D28D9' }}>Débito</p>
                      <p className="font-mono font-bold text-sm" style={{ color: '#6D28D9' }}>{formatBRL(parseFloat(m.debito))}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Gráfico + Alertas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--clr-border)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--clr-border)' }}>
            <div>
              <h2 className="font-bold text-sm" style={{ color: 'var(--clr-text)' }}>Vendas por dia</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>Faturamento bruto no período selecionado</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#40916C' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--clr-text-muted)' }}>Receita</span>
            </div>
          </div>
          <div className="px-3 py-4">
            {isLoading ? (
              <div className="h-44 rounded-xl" style={{ background: 'var(--clr-bg)', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
            ) : (
              <ResponsiveContainer width="100%" height={176}>
                <AreaChart data={vendasDia} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#40916C" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#40916C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-bg)" vertical={false} />
                  <XAxis dataKey="data" axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--clr-text-muted)', fontSize: 11 }}
                    tickFormatter={d => format(new Date(d + 'T12:00:00'), 'dd/MM')}
                  />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--clr-text-muted)', fontSize: 11 }}
                    tickFormatter={v => `R$${v}`} width={58}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#40916C', strokeWidth: 1, strokeDasharray: '4 2' }} />
                  <Area type="monotone" dataKey="total_vendas"
                    stroke="#40916C" strokeWidth={2.5} fill="url(#areaGrad)"
                    dot={false} activeDot={{ r: 5, fill: '#2D6A4F', stroke: '#fff', strokeWidth: 2 }}
                    animationDuration={1000} animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-2xl overflow-hidden flex flex-col" style={{ border: '1px solid var(--clr-border)' }}>
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid var(--clr-border)' }}>
            <h2 className="font-bold text-sm" style={{ color: 'var(--clr-text)' }}>Alertas de Estoque</h2>
            {alertas.length > 0 && (
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
                style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' }}
              >
                {alertas.length}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 228 }}>
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-12 rounded-lg" style={{ background: 'var(--clr-bg)', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />)}
              </div>
            ) : alertas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <span className="text-3xl">✅</span>
                <p className="text-sm font-semibold" style={{ color: 'var(--clr-green)' }}>Estoque em dia</p>
                <p className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>Nenhum produto abaixo do mínimo</p>
              </div>
            ) : (
              <ul>
                {alertas.map((a: any, i: number) => {
                  const urgente = a.urgente || parseFloat(a.estoque_atual) <= 0
                  const cor = urgente ? '#DC2626' : '#D97706'
                  return (
                    <li key={a.produto_id} className="flex items-center gap-3 px-4 py-2.5"
                      style={{
                        borderBottom: i < alertas.length - 1 ? '1px solid var(--clr-border)' : 'none',
                        borderLeft: `3px solid ${cor}`,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--clr-text)' }}>{a.produto_nome}</p>
                        <div className="mt-1.5">
                          <StockMiniBar atual={parseFloat(a.estoque_atual)} minimo={parseFloat(a.estoque_minimo)} />
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>
                          mín {fmtQtd(a.estoque_minimo)} {a.unidade_medida}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-sm" style={{ color: cor }}>{fmtQtd(a.estoque_atual)}</span>
                        <p className="text-[10px]" style={{ color: 'var(--clr-text-muted)' }}>{a.unidade_medida}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Curva ABC ── */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--clr-border)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--clr-border)' }}>
          <div>
            <h2 className="font-bold" style={{ color: 'var(--clr-text)' }}>Curva ABC — Top Produtos</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>Participação no faturamento do período</p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs font-semibold" style={{ color: 'var(--clr-text-muted)' }}>
            {[['A','#16A34A'],['B','#D97706'],['C','#94A3B8']].map(([c,color]) => (
              <span key={c} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                Classe {c}
              </span>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-10 rounded-lg" style={{ background: 'var(--clr-bg)', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />)}
          </div>
        ) : abc.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--clr-text-muted)' }}>
            Nenhuma venda no período
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--clr-bg)' }}>
                  {['#', 'Produto', 'Qtd. Vendas', 'Receita', 'Participação', 'Classe'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--clr-text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {abc.slice(0, 10).map((item: any, idx: number) => {
                  const rank = RANK_STYLE[idx]
                  return (
                    <tr
                      key={item.produto_id}
                      style={{ borderTop: '1px solid var(--clr-border)', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-green-pale)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td className="px-5 py-3.5">
                        {rank ? (
                          <span className="text-base">{rank.label}</span>
                        ) : (
                          <span className="font-mono text-xs font-bold" style={{ color: 'var(--clr-text-muted)' }}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-sm" style={{ color: 'var(--clr-text)' }}>
                        {item.produto_nome}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-sm" style={{ color: 'var(--clr-text-muted)' }}>
                        {fmtQtd(item.quantidade_vendida)}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-semibold text-sm" style={{ color: 'var(--clr-text)' }}>
                        {formatBRL(item.faturamento)}
                      </td>
                      <td className="px-5 py-3.5 w-44">
                        <div className="flex items-center gap-2">
                          <ParticipationBar pct={parseFloat(item.faturamento_pct)} classe={item.classificacao} />
                          <span className="font-mono text-xs font-semibold w-9 text-right shrink-0" style={{ color: 'var(--clr-text-muted)' }}>
                            {item.faturamento_pct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={item.classificacao === 'A' ? 'badge-a' : item.classificacao === 'B' ? 'badge-b' : 'badge-c'}>
                          Classe {item.classificacao}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
