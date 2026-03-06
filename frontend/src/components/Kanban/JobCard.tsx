import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatDistanceToNow, isPast, parseISO, differenceInDays } from 'date-fns'
import { zhCN } from 'date-fns/locale/zh-CN'
import type { Job } from '../../types'
import { categorize, INDUSTRY_COLORS } from '../../utils/categorize'

interface Props {
  job: Job
  accentColor: string
  onEdit: (job: Job) => void
  onDelete: (id: string) => void
}

export function JobCard({ job, accentColor, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: job.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const industry = categorize(job.company)
  const industryColor = INDUSTRY_COLORS[industry]

  const deadlineWarning = (() => {
    if (!job.deadline) return null
    const d = parseISO(job.deadline)
    const days = differenceInDays(d, new Date())
    if (isPast(d)) return 'expired'
    if (days <= 3) return 'urgent'
    return null
  })()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={[
        'job-card relative rounded-xl p-3 cursor-grab active:cursor-grabbing group select-none',
        'border',
        isDragging ? 'opacity-30 scale-95' : '',
        deadlineWarning === 'expired'
          ? 'bg-card border-red/20 opacity-50'
          : deadlineWarning === 'urgent'
          ? 'bg-card border-amber/40'
          : 'bg-card border-border hover:border-border',
      ].join(' ')}
    >
      {/* Accent bar */}
      <div
        className="absolute left-0 top-[14%] bottom-[14%] w-[2.5px] rounded-r-sm"
        style={{ background: accentColor }}
      />

      <div className="pl-3">
        {/* Company row */}
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <span className="text-[13px] font-semibold text-[#1D1D1F] truncate leading-snug">
            {job.company}
          </span>
          {/* Action buttons — visible on hover */}
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onEdit(job) }}
              className="w-5 h-5 flex items-center justify-center rounded text-muted
                         hover:text-[#1D1D1F] hover:bg-black/10 transition-colors text-[10px]"
              title="编辑"
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth={1.5}>
                <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/>
              </svg>
            </button>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onDelete(job.id) }}
              className="w-5 h-5 flex items-center justify-center rounded text-muted/60
                         hover:text-red hover:bg-red/10 transition-colors"
              title="删除"
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth={1.5}>
                <path d="M3 4h10M6 4V2h4v2M5 4v9h6V4"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Position */}
        <div className="text-[11.5px] text-muted leading-snug mb-2.5 truncate">{job.position}</div>

        {/* Footer */}
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] px-1.5 py-[2px] rounded-md font-medium tracking-tight"
            style={{ background: industryColor + '18', color: industryColor }}
          >
            {industry}
          </span>
          {job.deadline && (
            <span className={[
              'text-[10px] font-mono ml-auto',
              deadlineWarning === 'expired' ? 'text-red/60' :
              deadlineWarning === 'urgent'  ? 'text-amber' :
              'text-muted/50',
            ].join(' ')}>
              {deadlineWarning === 'expired'
                ? '已截止'
                : deadlineWarning === 'urgent'
                ? `${differenceInDays(parseISO(job.deadline), new Date())}天后截止`
                : formatDistanceToNow(parseISO(job.deadline), { locale: zhCN, addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
