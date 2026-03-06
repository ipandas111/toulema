import { useState } from 'react'
import { Board } from './components/Kanban/Board'
import { JobModal } from './components/JobModal'
import { useJobs } from './hooks/useJobs'
import type { Job, JobStatus } from './types'

export default function App() {
  const { jobs, loading, error, addJob, updateJob, updateStatus, deleteJob } = useJobs()
  const [modal, setModal] = useState<{ open: boolean; job?: Job | null; defaultStatus?: JobStatus }>({ open: false })
  const [search, setSearch] = useState('')

  const filtered = jobs.filter(j =>
    `${j.company} ${j.position} ${j.city ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:  jobs.length,
    active: jobs.filter(j => !['已拒绝', 'Offer'].includes(j.status)).length,
    offer:  jobs.filter(j => j.status === 'Offer').length,
  }

  const handleSave = async (data: Omit<Job, 'id' | 'created_at' | 'updated_at'>) => {
    if (modal.job) await updateJob(modal.job.id, data)
    else await addJob(data)
  }

  return (
    <div className="min-h-screen bg-bg text-white">
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur border-b border-border">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center gap-6">
          <div className="font-bold text-amber tracking-wide text-lg">投了吗</div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索公司、岗位..."
            className="flex-1 max-w-xs bg-surface border border-border rounded-lg px-3 py-1.5 text-sm
                       text-white placeholder:text-muted focus:border-amber/50 focus:outline-none"
          />
          <div className="flex gap-6 ml-auto text-center">
            {[{ n: stats.total, l: '总投递' }, { n: stats.active, l: '进行中' }, { n: stats.offer, l: 'Offer' }].map(s => (
              <div key={s.l}>
                <div className="font-mono text-lg font-medium text-amber leading-none">{s.n}</div>
                <div className="text-[10px] text-muted uppercase tracking-wider mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setModal({ open: true })}
            className="bg-amber hover:bg-amber/90 text-bg font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors">
            + 添加投递
          </button>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {loading && <div className="flex items-center justify-center h-64 text-muted text-sm">加载中...</div>}
        {error && <div className="bg-red/10 border border-red/30 text-red rounded-lg px-4 py-3 text-sm mb-4">数据加载失败：{error}</div>}
        {!loading && (
          <Board jobs={filtered} onStatusChange={updateStatus}
            onAdd={(status) => setModal({ open: true, defaultStatus: status })}
            onEdit={(job) => setModal({ open: true, job })}
            onDelete={deleteJob} />
        )}
      </main>
      <JobModal open={modal.open} job={modal.job} defaultStatus={modal.defaultStatus}
        onSave={handleSave} onClose={() => setModal({ open: false })} />
    </div>
  )
}
