import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from 'react-query'
import { format, subDays } from 'date-fns'
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

// ── Animated KPI Card ──────────────────────────────────────────────────────────

function TrendBadge({ trend }: { trend: number }) {
  const up = trend >= 0
  const color = up ? '#16A34A' : '#B91C1C'
  const bg    = up ? '#F0FDF4' : '#FEF2F2'
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md"
      style={{ background: bg, color }}
    >
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
        {up
          ? <path d="M8 3l5 5H3l5-5z" />
          : <path d="M8 13l5-5H3l5 5z" />
        }
      </svg>
      {Math.abs(trend).toFixed(1)}%
    </span>
  )
}

function AnimatedKpiCard({
  label, rawValue, fmt, cor, bg, border, icon, delay = 0, trend
}: {
  label: string; rawValue: number; fmt: 'brl' | 'pct' | 'num'
  cor: string; bg: string; border: string; icon: React.ReactNode; delay?: number
  trend?: number
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
      className="rounded-xl p-4 bg-white"
      style={{
        border: `1px solid ${border}`,
        boxShadow: '0 1px 4px rgba(45,106,79,0.06)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = `0 8px 24px rgba(45,106,79,0.12)`
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = '0 1px 4px rgba(45,106,79,0.06)'
        el.style.transform = 'translateY(0)'
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: bg, border: `1px solid ${border}`, color: cor }}
        >
          {icon}
        </div>
        {trend !== undefined && <TrendBadge trend={trend} />}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--clr-text-muted)' }}>
        {label}
      </p>
      <p
        className="font-mono font-bold text-xl truncate"
        style={{ color: 'var(--clr-text)', transition: 'opacity 0.15s' }}
      >
        {display}
      </p>
    </div>
  )
}

// ── Participation Bar ──────────────────────────────────────────────────────────

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

  const color = classe === 'A' ? '#16A34A' : classe === 'B' ? '#B45309' : 'var(--clr-text-muted)'

  return (
    <div ref={ref} className="w-full h-1.5 rounded-full" style={{ background: 'var(--clr-bg)' }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: color,
          transition: 'width 0.8s cubic-bezier(0.22,0.61,0.36,1)',
          maxWidth: '100%',
        }}
      />
    </div>
  )
}

// ── Stock Mini Bar ─────────────────────────────────────────────────────────────

function StockMiniBar({ atual, minimo }: { atual: number; minimo: number }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const max = Math.max(minimo * 4, atual * 1.2, 1)
    const pct = Math.min((atual / max) * 100, 100)
    const t = setTimeout(() => setWidth(pct), 100)
    return () => clearTimeout(t)
  }, [atual, minimo])

  const cor = atual <= 0        ? 'var(--clr-danger)'
            : atual <= minimo   ? '#F59E0B'
            : 'var(--clr-green-med)'

  return (
    <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--clr-bg)' }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: cor,
          transition: 'width 0.7s cubic-bezier(0.22,0.61,0.36,1)',
        }}
      />
    </div>
  )
}

// ── KPI Icon map ───────────────────────────────────────────────────────────────

const KPI_ICONS: Record<string, JSX.Element> = {
  faturamento_bruto: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  ),
  faturamento_liquido: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  lucro_bruto: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  margem_media: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14.25l6-6M9.75 9.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm8.25 6a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  ),
  quantidade_vendas: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  ),
  ticket_medio: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 6v.75a3.375 3.375 0 01-3.375 3.375h-1.5a3.375 3.375 0 01-3.375-3.375V6m10.5 0a2.25 2.25 0 00-2.25-2.25h-6A2.25 2.25 0 007.5 6m9 0h-9M3.75 21h16.5M5.625 15h12.75M3.75 17.25h16.5" />
    </svg>
  ),
  custo_total: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
    </svg>
  ),
  itens_vendidos: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  ),
}

const KPI_CONFIG = [
  { key: 'faturamento_bruto',   label: 'Faturamento Bruto',  fmt: 'brl' as const, cor: '#166534', bg: '#F0FDF4', border: '#A7F3D0' },
  { key: 'faturamento_liquido', label: 'Fat. Líquido',        fmt: 'brl' as const, cor: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  { key: 'lucro_bruto',         label: 'Lucro Bruto',         fmt: 'brl' as const, cor: '#065F46', bg: '#D1FAE5', border: '#6EE7B7' },
  { key: 'margem_media',        label: 'Margem Média',        fmt: 'pct' as const, cor: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
  { key: 'quantidade_vendas',   label: 'Qtd. Vendas',         fmt: 'num' as const, cor: 'var(--clr-green)', bg: 'var(--clr-green-pale)', border: 'var(--clr-border-2)' },
  { key: 'ticket_medio',        label: 'Ticket Médio',        fmt: 'brl' as const, cor: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' },
  { key: 'custo_total',         label: 'Custo Total',         fmt: 'brl' as const, cor: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
  { key: 'itens_vendidos',      label: 'Itens Vendidos',      fmt: 'num' as const, cor: 'var(--clr-text-med)', bg: 'var(--clr-green-pale)', border: 'var(--clr-border)' },
]

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-4 py-3 shadow-lg text-sm"
      style={{ background: '#fff', border: '1px solid var(--clr-border)', fontFamily: 'Inter, sans-serif' }}
    >
      <p className="font-semibold mb-1" style={{ color: 'var(--clr-text-muted)', fontSize: 11 }}>
        {format(new Date(label + 'T12:00:00'), "dd 'de' MMM")}
      </p>
      <p className="font-mono font-bold" style={{ color: 'var(--clr-green)' }}>
        {formatBRL(payload[0].value)}
      </p>
    </div>
  )
}

// ── Skeleton card ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl p-4 bg-white" style={{ border: '1px solid var(--clr-border)' }}>
      <div className="w-9 h-9 rounded-lg mb-3" style={{ background: 'var(--clr-bg)', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
      <div className="h-3 rounded mb-2 w-20" style={{ background: 'var(--clr-bg)', animation: 'skeletonPulse 1.4s ease-in-out 0.1s infinite' }} />
      <div className="h-6 rounded w-28" style={{ background: 'var(--clr-bg)', animation: 'skeletonPulse 1.4s ease-in-out 0.2s infinite' }} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [periodo, setPeriodo] = useState(7)

  const dataFim    = format(new Date(), 'yyyy-MM-dd')
  const dataInicio = format(subDays(new Date(), periodo), 'yyyy-MM-dd')

  const { data, isLoading } = useQuery(
    ['dashboard', dataInicio, dataFim],
    () => api.get(`/dashboard?data_inicio=${dataInicio}&data_fim=${dataFim}`).then(r => r.data),
    { refetchInterval: 60_000 }
  )

  const kpis      = data?.kpis
  const vendasDia = data?.vendas_por_dia  || []
  const alertas   = data?.alertas_estoque || []
  const abc       = data?.curva_abc       || []

  const salesTrend = useMemo(() => {
    if (!vendasDia || vendasDia.length < 2) return undefined
    const mid = Math.floor(vendasDia.length / 2)
    const firstHalf  = vendasDia.slice(0, mid).reduce((s: number, d: any) => s + (d.total_vendas || 0), 0)
    const secondHalf = vendasDia.slice(mid).reduce((s: number, d: any)  => s + (d.total_vendas || 0), 0)
    if (firstHalf === 0) return undefined
    return ((secondHalf - firstHalf) / firstHalf) * 100
  }, [vendasDia])

  return (
    <div className="p-6 space-y-5 animate-fade-in" style={{ background: 'var(--clr-bg)', minHeight: '100vh' }}>

      {/* Estilos para skeleton */}
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--clr-text)' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>
            {format(new Date(), "dd/MM/yyyy")} · Atualiza a cada minuto
          </p>
        </div>

        <div className="flex p-1 rounded-xl gap-1" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
          {PERIODOS.map(p => (
            <button
              key={p.days}
              onClick={() => setPeriodo(p.days)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={periodo === p.days
                ? { background: 'var(--clr-green)', color: '#fff', boxShadow: '0 2px 8px rgba(45,106,79,0.25)' }
                : { color: 'var(--clr-text-muted)' }
              }
              onMouseEnter={e => { if (periodo !== p.days) (e.currentTarget as HTMLElement).style.background = 'var(--clr-green-pale)' }}
              onMouseLeave={e => { if (periodo !== p.days) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_CONFIG.map((cfg, i) => (
          isLoading ? (
            <SkeletonCard key={cfg.key} />
          ) : (
            <AnimatedKpiCard
              key={cfg.key}
              label={cfg.label}
              rawValue={kpis ? parseFloat(kpis[cfg.key]) || 0 : 0}
              fmt={cfg.fmt}
              cor={cfg.cor}
              bg={cfg.bg}
              border={cfg.border}
              icon={KPI_ICONS[cfg.key]}
              delay={i * 60}
              trend={cfg.key === 'faturamento_bruto' || cfg.key === 'faturamento_liquido' || cfg.key === 'lucro_bruto'
                ? salesTrend
                : undefined}
            />
          )
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Gráfico de barras */}
        <div
          className="lg:col-span-2 rounded-xl bg-white p-5"
          style={{ border: '1px solid var(--clr-border)', boxShadow: '0 1px 4px rgba(45,106,79,0.05)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold" style={{ color: 'var(--clr-text)' }}>Vendas por dia</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>Faturamento bruto no período</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--clr-text-muted)' }}>
              <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--clr-green-med)' }} />
              Receita
            </div>
          </div>

          {isLoading ? (
            <div className="h-60 rounded-xl" style={{ background: 'var(--clr-bg)', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={vendasDia} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#40916C" stopOpacity={0.28} />
                    <stop offset="75%"  stopColor="#40916C" stopOpacity={0.06} />
                    <stop offset="100%" stopColor="#40916C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-bg)" vertical={false} />
                <XAxis
                  dataKey="data"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--clr-text-muted)', fontSize: 11 }}
                  tickFormatter={d => format(new Date(d + 'T12:00:00'), 'dd/MM')}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--clr-text-muted)', fontSize: 11 }}
                  tickFormatter={v => `R$${v}`}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--clr-green-med)', strokeWidth: 1, strokeDasharray: '4 2' }} />
                <Area
                  type="monotone"
                  dataKey="total_vendas"
                  stroke="#40916C"
                  strokeWidth={2.5}
                  fill="url(#areaGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#2D6A4F', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Alertas de estoque */}
        <div
          className="rounded-xl bg-white p-5"
          style={{ border: '1px solid var(--clr-border)', boxShadow: '0 1px 4px rgba(45,106,79,0.05)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold" style={{ color: 'var(--clr-text)' }}>Alertas de Estoque</h2>
            {alertas.length > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--clr-danger-bg)', color: 'var(--clr-danger)', border: '1px solid #FCA5A5' }}
              >
                {alertas.length}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-14 rounded-lg" style={{ background: 'var(--clr-bg)', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
              ))}
            </div>
          ) : alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} style={{ color: 'var(--clr-accent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <p className="text-sm font-semibold" style={{ color: 'var(--clr-green)' }}>Estoque em dia</p>
              <p className="text-xs" style={{ color: 'var(--clr-text-muted)' }}>Nenhum produto abaixo do mínimo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertas.map((a: any) => (
                <div
                  key={a.produto_id}
                  className="rounded-lg px-3 py-2.5"
                  style={a.urgente
                    ? { background: '#FEF2F2', border: '1px solid #FECACA' }
                    : { background: 'var(--clr-warning-bg)', border: '1px solid #FDE68A' }
                  }
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold" style={{ color: 'var(--clr-text)' }}>{a.produto_nome}</p>
                    <span className="font-mono font-bold text-sm" style={{ color: a.urgente ? 'var(--clr-danger)' : 'var(--clr-warning)' }}>
                      {a.estoque_atual}
                    </span>
                  </div>
                  <StockMiniBar atual={parseFloat(a.estoque_atual)} minimo={parseFloat(a.estoque_minimo)} />
                  <p className="text-[10px] mt-1" style={{ color: 'var(--clr-text-muted)' }}>
                    Mínimo: {a.estoque_minimo} {a.unidade_medida}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Curva ABC */}
      <div
        className="rounded-xl bg-white"
        style={{ border: '1px solid var(--clr-border)', boxShadow: '0 1px 4px rgba(45,106,79,0.05)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--clr-bg)' }}>
          <h2 className="font-bold" style={{ color: 'var(--clr-text)' }}>Curva ABC — Top Produtos</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>Participação no faturamento do período</p>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-10 rounded-lg" style={{ background: 'var(--clr-bg)', animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--clr-bg)' }}>
                  {['#', 'Produto', 'Vendas', 'Receita', 'Participação', 'Classe'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--clr-text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {abc.slice(0, 10).map((item: any, idx: number) => (
                  <tr
                    key={item.produto_id}
                    style={{
                      borderBottom: idx < 9 ? `1px solid var(--clr-bg)` : 'none',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--clr-green-pale)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td className="px-5 py-3 font-mono text-xs font-bold" style={{ color: 'var(--clr-text-muted)' }}>
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="px-5 py-3 font-semibold text-sm" style={{ color: 'var(--clr-text)' }}>{item.produto_nome}</td>
                    <td className="px-5 py-3 font-mono text-sm" style={{ color: 'var(--clr-text-muted)' }}>{item.quantidade_vendida}</td>
                    <td className="px-5 py-3 font-mono font-semibold text-sm" style={{ color: 'var(--clr-text)' }}>{formatBRL(item.faturamento)}</td>
                    <td className="px-5 py-3 w-40">
                      <div className="flex items-center gap-2">
                        <ParticipationBar pct={parseFloat(item.faturamento_pct)} classe={item.classificacao} />
                        <span className="font-mono text-xs font-semibold w-10 text-right shrink-0" style={{ color: 'var(--clr-text-muted)' }}>
                          {item.faturamento_pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={item.classificacao === 'A' ? 'badge-a' : item.classificacao === 'B' ? 'badge-b' : 'badge-c'}>
                        Classe {item.classificacao}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
