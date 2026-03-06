import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { JobCard } from './JobCard'
import type { Job, JobStatus } from '../../types'

interface Props {
  status: JobStatus
  color: string
  jobs: Job[]
  onAdd: (status: JobStatus) => void
  onEdit: (job: Job) => void
  onDelete: (id: string) => void
}

export function Column({ status, color, jobs, onAdd, onEdit, onDelete }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="w-[220px] flex-shrink-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: color }} />
          <h3 className="text-[13px] font-medium tracking-tight" style={{ color }}>{status}</h3>
        </div>
        <span className="font-mono text-[11px] text-muted tabular-nums">{jobs.length}</span>
      </div>

      {/* Droppable body */}
      <div
        ref={setNodeRef}
        className={[
          'flex-1 flex flex-col gap-2 min-h-[120px] rounded-xl p-2 transition-all duration-200',
          isOver ? 'bg-blue/[0.04] ring-1 ring-blue/20' : 'bg-black/[0.03]',
        ].join(' ')}
      >
        <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              accentColor={color}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>

        <button
          onClick={() => onAdd(status)}
          className="w-full text-muted/60 rounded-lg py-2 text-[12px] font-light
                     hover:text-muted hover:bg-black/[0.04] transition-all"
        >
          + 添加
        </button>
      </div>
    </div>
  )
}
