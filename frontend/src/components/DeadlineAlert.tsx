import { differenceInDays, isPast, parseISO, format } from 'date-fns'
import { zhCN } from 'date-fns/locale/zh-CN'
import type { Job } from '../types'

interface Props {
  jobs: Job[]
  onEdit: (job: Job) => void
}

export function DeadlineAlert({ jobs, onEdit }: Props) {
  const urgent = jobs
    .filter(j => j.deadline && j.status !== '已拒绝' && j.status !== 'Offer')
    .map(j => ({ job: j, days: differenceInDays(parseISO(j.deadline!), new Date()) }))
    .filter(({ days }) => days <= 7)
    .sort((a, b) => a.days - b.days)

  if (urgent.length === 0) return null

  return (
    <div className="max-w-[1600px] mx-auto px-6 pb-3">
      <div className="rounded-2xl border border-amber/30 bg-amber/[0.06] px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 text-amber flex-shrink-0"
            stroke="currentColor" strokeWidth={1.8}>
            <path d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM8 5v4M8 10.5v.5"/>
          </svg>
          <span className="text-[12px] font-semibold text-amber">
            {urgent.length} 个投递即将截止
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {urgent.map(({ job, days }) => {
            const expired = isPast(parseISO(job.deadline!)) && days < 0
            const label = expired
              ? '已截止'
              : days === 0
              ? '今天截止'
              : `${days} 天后`
            const accent = expired ? '#D93025' : days <= 2 ? '#FF9F0A' : '#636366'
            return (
              <button
                key={job.id}
                onClick={() => onEdit(job)}
                className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2
                           hover:shadow-sm transition-all text-left"
                style={{ borderColor: accent + '40' }}
              >
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
                <div>
                  <div className="text-[12px] font-semibold text-[#1D1D1F] leading-snug">{job.company}</div>
                  <div className="text-[10px] text-muted leading-tight">{job.position}</div>
                </div>
                <span
                  className="ml-2 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md"
                  style={{ background: accent + '15', color: accent }}
                >
                  {label}
                </span>
                <span className="text-[10px] text-muted/60 font-mono">
                  {format(parseISO(job.deadline!), 'MM/dd', { locale: zhCN })}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
