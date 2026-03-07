import { useMemo } from 'react'
import { parseISO, format, startOfWeek, addDays, differenceInCalendarWeeks, isAfter } from 'date-fns'
import { zhCN } from 'date-fns/locale/zh-CN'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { Job } from '../types'

interface Props { jobs: Job[] }

export function Timeline({ jobs }: Props) {
  const data = useMemo(() => {
    if (jobs.length === 0) return []

    const sorted = [...jobs].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const firstDate = startOfWeek(parseISO(sorted[0].created_at), { weekStartsOn: 1 })
    const lastDate  = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weeks     = differenceInCalendarWeeks(lastDate, firstDate, { weekStartsOn: 1 }) + 1

    return Array.from({ length: weeks }, (_, i) => {
      const weekStart = addDays(firstDate, i * 7)
      const weekEnd   = addDays(weekStart, 7)
      const count = sorted.filter(j => {
        const d = parseISO(j.created_at)
        return !isAfter(weekStart, d) && isAfter(weekEnd, d)
      }).length
      return {
        week: format(weekStart, 'M/d', { locale: zhCN }),
        count,
      }
    })
  }, [jobs])

  const tooltipStyle = {
    background: '#fff',
    border: '1px solid #D2D2D7',
    borderRadius: 10,
    fontSize: 12,
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    padding: '6px 12px',
  }

  if (jobs.length === 0) return null

  const total = data.reduce((s, d) => s + d.count, 0)
  const peak  = Math.max(...data.map(d => d.count))
  const peakWeek = data.find(d => d.count === peak)

  return (
    <div className="max-w-[1600px] mx-auto px-6 pb-4">
      <div className="bg-surface border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[13px] font-semibold text-[#1D1D1F]">投递节奏</div>
          <div className="flex items-center gap-4 text-[11px] text-muted">
            {peakWeek && peak > 0 && (
              <span>
                峰值 <span className="font-mono font-semibold text-amber">{peak} 条</span>
                <span className="ml-1 opacity-60">({peakWeek.week} 周)</span>
              </span>
            )}
            <span>
              共 <span className="font-mono font-semibold text-[#1D1D1F]">{total} 条</span>
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#FF9F0A" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#FF9F0A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#F0F0F2" />
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#86868B' }}
              axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#86868B' }}
              axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v) => [Number(v || 0) + ' 条', '投递数']}
              labelFormatter={(l) => `${l} 周`}
            />
            <Area
              type="monotone" dataKey="count"
              stroke="#FF9F0A" strokeWidth={2}
              fill="url(#grad)" dot={false}
              activeDot={{ r: 4, fill: '#FF9F0A', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
