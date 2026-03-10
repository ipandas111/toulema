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
        isDragging ? 'dragging' : '',
        deadlineWarning === 'expired'
          ? 'opacity-50'
          : '',
      ].join(' ')}
    >
      {/* Card background with subtle shadow */}
      <div className="absolute inset-0 rounded-xl bg-white"
        style={{
          boxShadow: isDragging ? 'var(--shadow-xl)' : 'var(--shadow-sm)',
          border: '1px solid var(--color-border)'
        }} />

      {/* Accent bar */}
      <div
        className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-r"
        style={{ background: accentColor }}
      />

      <div className="relative pl-3">
        {/* Company row */}
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <span className="text-sm font-semibold text-[#1D1D1F] truncate leading-snug">
            {job.company}
          </span>
          {/* Action buttons — visible on hover */}
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onEdit(job) }}
              className="w-6 h-6 flex items-center justify-center rounded-md text-[#86868B]
                         hover:text-[#1D1D1F] hover:bg-black/5 transition-colors"
              title="编辑"
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={1.5}>
                <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/>
              </svg>
            </button>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onDelete(job.id) }}
              className="w-6 h-6 flex items-center justify-center rounded-md text-[#86868B]
                         hover:text-red-500 hover:bg-red-50 transition-colors"
              title="删除"
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={1.5}>
                <path d="M3 4h10M6 4V2h4v2M5 4v9h6V4"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Position */}
        <div className="text-xs text-[#86868B] leading-snug mb-3 truncate">{job.position}</div>

        {/* Footer */}
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] px-2 py-1 rounded-md font-medium"
            style={{ background: industryColor + '15', color: industryColor }}
          >
            {industry}
          </span>
          {job.deadline && (
            <span className={[
              'text-[10px] font-mono ml-auto',
              deadlineWarning === 'expired' ? 'text-red-500/60' :
              deadlineWarning === 'urgent'  ? 'text-amber-500' :
              'text-[#AEAEB2]',
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
