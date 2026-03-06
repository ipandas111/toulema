import {
  DndContext, DragOverlay,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { } from '@dnd-kit/sortable'
import { useState } from 'react'
import { Column } from './Column'
import { JobCard } from './JobCard'
import { COLUMNS } from '../../types'
import type { Job, JobStatus } from '../../types'

interface Props {
  jobs: Job[]
  onStatusChange: (id: string, status: JobStatus) => void
  onAdd: (status: JobStatus) => void
  onEdit: (job: Job) => void
  onDelete: (id: string) => void
}

export function Board({ jobs, onStatusChange, onAdd, onEdit, onDelete }: Props) {
  const [activeJob, setActiveJob] = useState<Job | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveJob(jobs.find(j => j.id === active.id) ?? null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveJob(null)
    if (!over) return
    const job = jobs.find(j => j.id === active.id)
    if (!job) return

    const overId = over.id as string
    const isColumn = COLUMNS.some(c => c.status === overId)
    const targetStatus: JobStatus = isColumn
      ? (overId as JobStatus)
      : (jobs.find(j => j.id === overId)?.status ?? job.status)

    if (targetStatus !== job.status) {
      onStatusChange(job.id, targetStatus)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-5 overflow-x-auto pb-6 board-scroll">
        {COLUMNS.map(col => (
          <Column
            key={col.status}
            status={col.status}
            color={col.color}
            jobs={jobs.filter(j => j.status === col.status)}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DragOverlay>
        {activeJob && (
          <JobCard
            job={activeJob}
            accentColor={COLUMNS.find(c => c.status === activeJob.status)?.color ?? '#5A6A8A'}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
