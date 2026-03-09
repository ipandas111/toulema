import { useMemo } from 'react'
import { parseISO, format, startOfWeek, endOfWeek, eachDayOfInterval, subMonths } from 'date-fns'
import { zhCN } from 'date-fns/locale/zh-CN'
import type { Job } from '../types'

interface Props { jobs: Job[] }

export function CalendarHeatmap({ jobs }: Props) {
  const { days, maxCount } = useMemo(() => {
    if (jobs.length === 0) return { days: [], maxCount: 0 }

    // 获取过去 3 个月的数据
    const today = new Date()
    const start = startOfWeek(subMonths(today, 3), { weekStartsOn: 0 })
    const end = endOfWeek(today, { weekStartsOn: 0 })

    const allDays = eachDayOfInterval({ start, end })

    // 统计每天的投递数量
    const countMap = new Map<string, number>()
    jobs.forEach(job => {
      const dayKey = format(parseISO(job.created_at), 'yyyy-MM-dd')
      countMap.set(dayKey, (countMap.get(dayKey) || 0) + 1)
    })

    const counts = allDays.map(day => ({
      date: day,
      count: countMap.get(format(day, 'yyyy-MM-dd')) || 0,
    }))

    const maxCount = Math.max(...counts.map(d => d.count), 1)
    return { days: counts, maxCount }
  }, [jobs])

  const getColor = (count: number) => {
    if (count === 0) return 'bg-[#F0F0F2]'
    const intensity = count / maxCount
    if (intensity <= 0.25) return 'bg-amber/30'
    if (intensity <= 0.5) return 'bg-amber/50'
    if (intensity <= 0.75) return 'bg-amber/70'
    return 'bg-amber'
  }

  // 按周分组
  const weeks = useMemo(() => {
    const result: typeof days[] = []
    let currentWeek: typeof days = []
    days.forEach((day, i) => {
      currentWeek.push(day)
      if (day.date.getDay() === 6 || i === days.length - 1) {
        result.push(currentWeek)
        currentWeek = []
      }
    })
    return result
  }, [days])

  if (jobs.length === 0) return null

  const total = jobs.length

  return (
    <div className="max-w-[1600px] mx-auto px-6 pb-4">
      <div className="bg-surface border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[13px] font-semibold text-[#1D1D1F]">投递日历</div>
          <div className="flex items-center gap-4 text-[11px] text-muted">
            <span>
              共 <span className="font-mono font-semibold text-[#1D1D1F]">{total} 条</span>
            </span>
          </div>
        </div>

        {/* 图例 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-muted mr-1">少</span>
          <div className="w-3 h-3 rounded-sm bg-[#F0F0F2]" />
          <div className="w-3 h-3 rounded-sm bg-amber/30" />
          <div className="w-3 h-3 rounded-sm bg-amber/50" />
          <div className="w-3 h-3 rounded-sm bg-amber/70" />
          <div className="w-3 h-3 rounded-sm bg-amber" />
          <span className="text-[10px text-muted ml-1">多</span>
        </div>

        {/* 日历网格 */}
        <div className="flex gap-1 overflow-x-auto pb-2">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-4 h-4 rounded-sm ${getColor(day.count)} transition-all hover:ring-2 hover:ring-amber/50`}
                  title={`${format(day.date, 'M月d日', { locale: zhCN })}: ${day.count} 条投递`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* 月份标签 */}
        <div className="relative mt-2 h-4 text-[10px] text-muted">
          {useMemo(() => {
            const months: { month: string; weekIndex: number }[] = []
            let lastMonth = ''
            weeks.forEach((week, wi) => {
              const firstDayOfWeek = week[0]
              const month = format(firstDayOfWeek.date, 'M月', { locale: zhCN })
              if (month !== lastMonth) {
                months.push({ month, weekIndex: wi })
                lastMonth = month
              }
            })
            return months
          }, [weeks]).map((item, i) => (
            <span
              key={i}
              className="absolute"
              style={{ left: `${item.weekIndex * 20 + 8}px` }}
            >
              {item.month}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
