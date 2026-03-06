import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatDistanceToNow, isPast, parseISO, differenceInDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Job } from '../../types'

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
    opacity: isDragging ? 0.4 : 1,
  }

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
        'relative bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing',
        'transition-all duration-150 hover:-translate-y-px hover:shadow-xl',
        'group select-none',
        deadlineWarning === 'expired' ? 'border-red/50 opacity-60' :
        deadlineWarning === 'urgent'  ? 'border-amber/60' :
        'border-border hover:border-white/10',
      ].join(' ')}
    >
      {/* accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
        style={{ background: accentColor }}
      />

      <div className="pl-2">
        <div className="text-sm font-semibold text-white mb-0.5 truncate">{job.company}</div>
        <div className="text-xs text-muted leading-snug mb-2 truncate">{job.position}</div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 items-center">
            {job.channel && (
              <span className="text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-muted">
                {job.channel}
              </span>
            )}
            {job.deadline && (
              <span className={[
                'text-[10px] font-mono',
                deadlineWarning === 'expired' ? 'text-red' :
                deadlineWarning === 'urgent'  ? 'text-amber' :
                'text-muted',
              ].join(' ')}>
                {deadlineWarning === 'expired' ? '已截止' :
                 deadlineWarning === 'urgent'  ? `${differenceInDays(parseISO(job.deadline), new Date())}天后截止` :
                 formatDistanceToNow(parseISO(job.deadline), { locale: zhCN, addSuffix: true })}
              </span>
            )}
          </div>

          {/* action buttons */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onEdit(job) }}
              className="text-muted hover:text-white p-1 rounded text-xs"
            >✏️</button>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onDelete(job.id) }}
              className="text-muted hover:text-red p-1 rounded text-xs"
            >🗑</button>
          </div>
        </div>
      </div>
    </div>
  )
}
