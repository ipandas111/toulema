import { useState, useMemo } from 'react'
import { Board } from './components/Kanban/Board'
import { JobModal } from './components/JobModal'
// import { Analytics } from './components/Analytics'
import { FilterBar } from './components/FilterBar'
import type { Filters } from './components/FilterBar'
// import { DeadlineAlert } from './components/DeadlineAlert'
// import { Timeline } from './components/Timeline'
// import { CalendarHeatmap } from './components/CalendarHeatmap'
// import { DataBackup } from './components/DataBackup'
// import { AIAssistant } from './components/AIAssistant'
import { useJobs } from './hooks/useJobs'
import { useAuth } from './lib/auth'
import { LoginPage } from './components/Login'
import { categorize } from './utils/categorize'
import type { Job, JobStatus } from './types'

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { jobs, loading, error, addJob, updateJob, updateStatus, deleteJob } = useJobs(user?.id ?? null)
  const [modal, setModal] = useState<{ open: boolean; job?: Job | null; defaultStatus?: JobStatus }>({ open: false })
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>({ industry: null, status: null })

  const filtered = useMemo(() => jobs.filter(j => {
    const matchSearch = `${j.company} ${j.position} ${j.city ?? ''}`.toLowerCase().includes(search.toLowerCase())
    const matchIndustry = !filters.industry || categorize(j.company) === filters.industry
    const matchStatus = !filters.status || j.status === filters.status
    return matchSearch && matchIndustry && matchStatus
  }), [jobs, search, filters])

  const stats = useMemo(() => ({
    total:    jobs.length,
    active:   jobs.filter(j => !['已拒绝', 'Offer'].includes(j.status)).length,
    offer:    jobs.filter(j => j.status === 'Offer').length,
    rejected: jobs.filter(j => j.status === '已拒绝').length,
  }), [jobs])

  const handleSave = async (data: Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      if (modal.job) await updateJob(modal.job.id, data)
      else await addJob(data)
    } catch (e) {
      console.error('Save failed:', e)
      alert('保存失败，请重试')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-[15px] text-[#86868B]">加载中...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="min-h-screen bg-bg text-[#1D1D1F]">
      <header className="sticky top-0 z-40 border-b border-border"
        style={{ background: 'rgba(245,245,247,0.92)', backdropFilter: 'blur(24px) saturate(180%)' }}>
        <div className="max-w-[1600px] mx-auto px-8 h-[52px] flex items-center gap-6">
          <span className="font-semibold text-[15px] tracking-tight text-[#1D1D1F] flex-shrink-0">投了吗</span>

          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索公司、岗位..."
              className="w-full bg-[#E8E8ED] border-0 rounded-lg pl-8 pr-3 py-1.5 text-[13px]
                         text-[#1D1D1F] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-amber/40 transition-all"
            />
          </div>

          <button onClick={() => signOut()} className="text-[13px] text-[#86868B] hover:text-[#1D1D1F] flex-shrink-0">
            退出登录
          </button>

          <button onClick={() => setModal({ open: true })} className="flex items-center gap-1 bg-amber
            text-black font-semibold px-4 py-1.5 rounded-lg text-[13px] transition-opacity
            hover:opacity-85 active:opacity-70 flex-shrink-0">
            <span className="text-[15px] leading-none">+</span>
            <span>添加投递</span>
          </button>
        </div>
      </header>

      {/* Stats bar */}
      <div className="border-b border-border bg-surface">
        <div className="max-w-[1600px] mx-auto px-8 py-4 flex gap-4">
          {[
            { n: stats.total,    l: '总投递', sub: '所有记录', accent: '#1D1D1F', bg: '#F5F5F7', border: '#D2D2D7' },
            { n: stats.active,   l: '进行中', sub: '待跟进',   accent: '#0071E3', bg: '#EBF3FF', border: '#BAD3F5' },
            { n: stats.offer,    l: 'Offer',  sub: '已拿到',   accent: '#1D9E5F', bg: '#EAFAF2', border: '#A8DFC2' },
            { n: stats.rejected, l: '已拒绝', sub: '未通过',   accent: '#D93025', bg: '#FEF0EF', border: '#F4B8B5' },
          ].map(s => (
            <div key={s.l} className="flex items-center gap-4 flex-1 rounded-xl px-5 py-3.5 border"
              style={{ background: s.bg, borderColor: s.border }}>
              <div className="font-mono text-[36px] font-semibold leading-none tabular-nums"
                style={{ color: s.accent }}>{s.n}</div>
              <div>
                <div className="text-[14px] font-semibold text-[#1D1D1F] leading-snug">{s.l}</div>
                <div className="text-[11px] text-muted mt-0.5">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* <Analytics jobs={jobs} /> */}
      {/* <Timeline jobs={jobs} /> */}
      {/* {jobs.length > 0 && <CalendarHeatmap jobs={jobs} />} */}
      {/* <DataBackup userId={user?.id ?? null} jobs={jobs} /> */}
      {/* <DeadlineAlert jobs={jobs} onEdit={(job) => setModal({ open: true, job })} /> */}
      {/* <AIAssistant /> */}
      <main className="max-w-[1600px] mx-auto px-6 py-5">
        {loading && <LoadingSkeleton />}
        {error && <div className="bg-red/10 border border-red/30 text-red rounded-lg px-4 py-3 text-sm mb-4">数据加载失败：{error}</div>}
        {!loading && (
          <>
            <FilterBar jobs={jobs} filters={filters} onChange={setFilters} />
            {filtered.length === 0 && jobs.length > 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10 text-muted/30" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="22" cy="22" r="16"/><path d="m34 34 8 8"/>
                  <path d="M16 22h12M22 16v12" strokeLinecap="round"/>
                </svg>
                <div className="text-[13px] text-muted">没有符合条件的投递</div>
                <button onClick={() => setFilters({ industry: null, status: null })}
                  className="text-[12px] text-amber hover:underline">清除所有筛选</button>
              </div>
            ) : (
              <Board jobs={filtered} onStatusChange={updateStatus}
                onAdd={(status) => setModal({ open: true, defaultStatus: status })}
                onEdit={(job) => setModal({ open: true, job })}
                onDelete={deleteJob} />
            )}
          </>
        )}
      </main>
      <JobModal open={modal.open} job={modal.job} defaultStatus={modal.defaultStatus}
        onSave={handleSave} onClose={() => setModal({ open: false })} />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex gap-5 overflow-hidden pb-6 animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="w-[220px] flex-shrink-0">
          <div className="h-4 bg-black/[0.06] rounded-full mb-3 w-16" />
          <div className="rounded-xl bg-black/[0.03] p-2 flex flex-col gap-2 min-h-[120px]">
            {Array.from({ length: i < 3 ? 2 : 1 }).map((_, j) => (
              <div key={j} className="bg-white border border-border rounded-xl p-3">
                <div className="h-3 bg-black/[0.06] rounded-full mb-2 w-3/4" />
                <div className="h-2.5 bg-black/[0.04] rounded-full w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
