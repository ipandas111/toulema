import { useState, useMemo } from 'react'
import { parseISO, format, addMonths, subMonths, getMonth, getYear, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday } from 'date-fns'
import { zhCN } from 'date-fns/locale/zh-CN'
import type { Job } from '../types'

interface Props { jobs: Job[] }

// 获取投递日期（优先使用 applied_at，否则用 created_at）
function getJobDate(job: Job): Date {
  if (job.applied_at) {
    return parseISO(job.applied_at)
  }
  return parseISO(job.created_at)
}

export function CalendarHeatmap({ jobs }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const { calendarDays, stats } = useMemo(() => {
    if (jobs.length === 0) return { calendarDays: [], stats: { total: 0 } }

    const jobByDate = new Map<string, Job[]>()
    jobs.forEach(job => {
      const jobDate = getJobDate(job)
      const dayKey = format(jobDate, 'yyyy-MM-dd')
      const existing = jobByDate.get(dayKey) || []
      existing.push(job)
      jobByDate.set(dayKey, existing)
    })

    const year = getYear(currentDate)
    const month = getMonth(currentDate)
    const monthStart = startOfMonth(new Date(year, month, 1))
    const monthEnd = endOfMonth(new Date(year, month, 1))
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const allDays = eachDayOfInterval({ start: calStart, end: calEnd })

    const days = allDays.map(d => {
      const dayKey = format(d, 'yyyy-MM-dd')
      const dayJobs = jobByDate.get(dayKey) || []
      return {
        date: d,
        isCurrentMonth: isSameMonth(d, new Date(year, month, 1)),
        jobs: dayJobs.slice(0, 3),  // 最多显示3个
        moreCount: Math.max(0, dayJobs.length - 3),
      }
    })

    return { calendarDays: days, stats: { total: jobs.length } }
  }, [jobs, currentDate])

  const goToPrevMonth = () => setCurrentDate(d => subMonths(d, 1))
  const goToNextMonth = () => setCurrentDate(d => addMonths(d, 1))

  if (jobs.length === 0) return null

  return (
    <div className="max-w-[1600px] mx-auto px-6 pb-4">
      <div className="bg-surface border border-border rounded-xl p-2">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevMonth}
              className="w-4 h-4 rounded bg-[#F5F5F7] hover:bg-[#E8E8ED] flex items-center justify-center text-muted"
            >
              <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-[10px] font-semibold text-[#1D1D1F] min-w-[50px] text-center">
              {format(currentDate, 'yyyy年M月', { locale: zhCN })}
            </div>
            <button
              onClick={goToNextMonth}
              className="w-4 h-4 rounded bg-[#F5F5F7] hover:bg-[#E8E8ED] flex items-center justify-center text-muted"
            >
              <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="text-[8px] text-muted">
            共 <span className="font-mono font-semibold text-[#1D1D1F]">{stats.total}</span> 条
          </div>
        </div>

        {/* 星期 */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {['日', '一', '二', '三', '四', '五', '六'].map((d, i) => (
            <div key={i} className="text-[8px] text-muted/60 text-center py-0.5">{d}</div>
          ))}
        </div>

        {/* 日历格子 */}
        <div className="grid grid-cols-7 gap-px">
          {calendarDays.map((day, i) => (
            <div
              key={i}
              onClick={() => setSelectedDate(day.date)}
              className={`
                min-h-[48px] p-0.5 rounded cursor-pointer transition-colors
                ${day.isCurrentMonth ? 'bg-white' : 'bg-[#FAFAFA]'}
                ${isToday(day.date) ? 'ring-1 ring-amber' : 'hover:bg-[#F5F5F7]'}
              `}
            >
              <div className={`text-[8px] font-medium mb-0.5 ${day.isCurrentMonth ? 'text-[#1D1D1F]' : 'text-[#C7C7CC]'} ${isToday(day.date) ? 'font-bold text-amber' : ''}`}>
                {format(day.date, 'd')}
              </div>
              <div className="space-y-0.5">
                {day.jobs.map((job, ji) => (
                  <div
                    key={ji}
                    className="text-[7px] font-medium px-1 py-0.5 rounded bg-[#F5F5F7] text-[#1D1D1F] truncate"
                  >
                    {job.company}
                  </div>
                ))}
                {day.moreCount > 0 && (
                  <div className="text-[6px] text-[#86868B]">+{day.moreCount} more</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 弹窗 */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setSelectedDate(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-white rounded-xl shadow-xl w-[280px] max-h-[320px] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <div className="text-[12px] font-semibold text-[#1D1D1F]">
                {format(selectedDate, 'M月d日', { locale: zhCN })}
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="w-5 h-5 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] flex items-center justify-center text-muted text-xs"
              >
                ×
              </button>
            </div>
            <div className="p-2 max-h-[260px] overflow-y-auto">
              {calendarDays.find(d => format(d.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))?.jobs.length === 0 ? (
                <div className="text-[11px] text-muted text-center py-4">暂无投递</div>
              ) : (
                <div className="space-y-1.5">
                  {calendarDays.find(d => format(d.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))?.jobs.map(job => (
                    <div key={job.id} className="p-2 bg-[#F5F5F7] rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-[#1D1D1F]">{job.company}</span>
                        <span className="text-[9px] text-muted">·</span>
                        <span className="text-[10px] text-muted">{job.position}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] px-1 py-0.5 bg-amber/20 text-amber rounded">{job.status}</span>
                        {job.city && <span className="text-[9px] text-muted">{job.city}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
