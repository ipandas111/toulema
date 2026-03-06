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
    <div className="w-52 flex-shrink-0 flex flex-col">
      {/* header */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-lg mb-2"
        style={{ background: `${color}18`, borderBottom: `2px solid ${color}` }}
      >
        <h3 className="text-xs font-semibold tracking-widest uppercase" style={{ color }}>
          {status}
        </h3>
        <span className="font-mono text-[11px] bg-white/5 px-2 py-0.5 rounded-full text-muted">
          {jobs.length}
        </span>
      </div>

      {/* droppable body */}
      <div
        ref={setNodeRef}
        className={[
          'flex-1 flex flex-col gap-2 min-h-[100px] rounded-b-lg p-1 transition-colors',
          isOver ? 'bg-blue/5 outline-dashed outline-1 outline-blue/30' : '',
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
          className="w-full border border-dashed border-border text-muted rounded-lg py-2 text-xs
                     hover:border-amber hover:text-amber hover:bg-amber/5 transition-all"
        >
          + 添加
        </button>
      </div>
    </div>
  )
}
