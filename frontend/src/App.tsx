import { useState, useMemo, useRef, useEffect } from 'react'
import { Board } from './components/Kanban/Board'
import { JobModal } from './components/JobModal'
import { Analytics } from './components/Analytics'
import { FilterBar } from './components/FilterBar'
import type { Filters } from './components/FilterBar'
import { DeadlineAlert } from './components/DeadlineAlert'
import { CalendarHeatmap } from './components/CalendarHeatmap'
import { AISearch } from './components/AISearch'
import { useJobs } from './hooks/useJobs'
import { categorize } from './utils/categorize'
import type { Job, JobStatus } from './types'

// 获取本地用户 ID
function getLocalUserId(): string {
  const STORAGE_KEY = 'toulema_local_user'
  let userId = localStorage.getItem(STORAGE_KEY)
  if (!userId) {
    userId = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, userId)
  }
  return userId
}

// 数据备份相关
const JOBS_KEY = 'toulema_jobs'

function handleExport(userId: string) {
  const allJobs: Record<string, Job[]> = JSON.parse(localStorage.getItem(JOBS_KEY) || '{}')
  const userJobs = allJobs[userId] || []

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    jobs: userJobs,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `toulema-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const userId = getLocalUserId()
  const { jobs, loading, error, addJob, updateJob, updateStatus, deleteJob, refetch } = useJobs(userId)
  const [modal, setModal] = useState<{ open: boolean; job?: Job | null; defaultStatus?: JobStatus }>({ open: false })
  const [filters, setFilters] = useState<Filters>({ industry: null, status: null })
  const importFileRef = useRef<HTMLInputElement>(null)

  // 处理从插件导入的数据
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const importData = params.get('import')

    if (importData) {
      try {
        const decoded = decodeURIComponent(atob(importData))
        const importedJobs = JSON.parse(decoded)

        if (Array.isArray(importedJobs) && importedJobs.length > 0) {
          // 合并数据
          const allJobs: Record<string, Job[]> = JSON.parse(localStorage.getItem(JOBS_KEY) || '{}')
          const existingJobs = allJobs[userId] || []
          const existingIds = new Set(existingJobs.map(j => j.id))

          const newJobs = importedJobs.filter((j: Job) => !existingIds.has(j.id))
          const merged = [...existingJobs, ...newJobs]

          allJobs[userId] = merged
          localStorage.setItem(JOBS_KEY, JSON.stringify(allJobs))

          // 清理 URL 参数
          window.history.replaceState({}, '', window.location.pathname)

          alert(`成功从插件导入 ${newJobs.length} 条记录`)
          refetch()
        }
      } catch (e) {
        console.error('Import from extension failed:', e)
      }
    }
  }, [userId, refetch])

  // 处理文件导入
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (!data.jobs || !Array.isArray(data.jobs)) {
          alert('文件格式错误')
          return
        }

        const allJobs: Record<string, Job[]> = JSON.parse(localStorage.getItem(JOBS_KEY) || '{}')
        const existingJobs = allJobs[userId] || []
        const existingIds = new Set(existingJobs.map(j => j.id))

        const newJobs = data.jobs.filter((j: Job) => !existingIds.has(j.id))
        const merged = [...existingJobs, ...newJobs]

        allJobs[userId] = merged
        localStorage.setItem(JOBS_KEY, JSON.stringify(allJobs))

        alert(`成功导入 ${newJobs.length} 条记录`)
        refetch()
      } catch {
        alert('解析文件失败')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const filtered = useMemo(() => jobs.filter(j => {
    const matchIndustry = !filters.industry || categorize(j.company) === filters.industry
    const matchStatus = !filters.status || j.status === filters.status
    return matchIndustry && matchStatus
  }), [jobs, filters])

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

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Subtle grain texture */}
      <div className="grain-overlay" />

      {/* Header */}
      <header className="sticky top-0 z-40"
        style={{
          background: 'rgba(250, 250, 250, 0.8)',
          backdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid var(--color-border)'
        }}>
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center gap-5">
          {/* Logo */}
          <span className="font-semibold text-base tracking-tight text-[#1D1D1F] flex-shrink-0"
            style={{ fontWeight: 600 }}>
            投了吗
          </span>

          {/* AI Search */}
          <AISearch />

          {/* Add button - 重点强调 */}
          <button onClick={() => setModal({ open: true })}
            className="btn-primary flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 shadow-lg hover:shadow-xl transition-all"
            style={{ background: '#FF9F0A', color: 'black' }}>
            <span className="text-base leading-none">+</span>
            <span>添加投递</span>
          </button>

          {/* Actions - 右侧 */}
          <div className="ml-auto flex items-center gap-4">
            <button onClick={() => handleExport(userId)}
              className="text-sm text-[#86868B] hover:text-[#1D1D1F] flex-shrink-0 transition-colors">
              导出
            </button>

            <button onClick={() => importFileRef.current?.click()}
              className="text-sm text-[#86868B] hover:text-[#1D1D1F] flex-shrink-0 transition-colors">
              导入
            </button>
          </div>
          <input
            ref={importFileRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </header>

      {/* Stats bar */}
      <div className="border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="max-w-[1600px] mx-auto px-6 py-5 flex gap-3">
          {[
            { n: stats.total,    l: '总投递', sub: '所有记录', accent: '#1D1D1F', bg: '#F0F0F2' },
            { n: stats.active,   l: '进行中', sub: '待跟进',   accent: '#0071E3', bg: '#E8F4FD' },
            { n: stats.offer,    l: 'Offer',  sub: '已拿到',   accent: '#1D9E5F', bg: '#E6F7EF' },
            { n: stats.rejected, l: '已拒绝', sub: '未通过',   accent: '#D93025', bg: '#FCEAE9' },
          ].map((s, i) => (
            <div key={s.l} className="column-animate flex items-center gap-3 flex-1 rounded-xl px-4 py-3"
              style={{ background: s.bg, animationDelay: `${i * 50}ms` }}>
              <div className="font-mono text-[32px] font-semibold leading-none tabular-nums"
                style={{ color: s.accent }}>{s.n}</div>
              <div>
                <div className="text-sm font-medium text-[#1D1D1F] leading-tight">{s.l}</div>
                <div className="text-xs text-[#86868B] mt-0.5">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Analytics jobs={jobs} />
      {jobs.length > 0 && <CalendarHeatmap jobs={jobs} />}
      <DeadlineAlert jobs={jobs} onEdit={(job) => setModal({ open: true, job })} />

      <main className="max-w-[1600px] mx-auto px-5 py-6">
        {loading && <LoadingSkeleton />}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{ background: 'rgba(217, 48, 37, 0.1)', color: '#D93025', border: '1px solid rgba(217, 48, 37, 0.2)' }}>
            数据加载失败：{error}
          </div>
        )}
        {!loading && (
          <>
            <FilterBar jobs={jobs} filters={filters} onChange={setFilters} />
            {filtered.length === 0 && jobs.length > 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12 text-[#D1D1D6]" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="22" cy="22" r="16"/><path d="m34 34 8 8"/>
                  <path d="M16 22h12M22 16v12" strokeLinecap="round"/>
                </svg>
                <div className="text-sm text-[#86868B]">没有符合条件的投递</div>
                <button onClick={() => setFilters({ industry: null, status: null })}
                  className="text-xs" style={{ color: '#FF9F0A' }}>清除所有筛选</button>
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
    <div className="flex gap-4 overflow-hidden pb-6">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="w-[200px] flex-shrink-0">
          <div className="h-4 rounded-full mb-3 w-14 skeleton" />
          <div className="rounded-xl p-2 flex flex-col gap-2 min-h-[100px]" style={{ background: '#F0F0F2' }}>
            {Array.from({ length: i < 3 ? 2 : 1 }).map((_, j) => (
              <div key={j} className="rounded-lg p-3" style={{ background: 'white', boxShadow: 'var(--shadow-sm)' }}>
                <div className="h-3 rounded-full mb-2 w-3/4 skeleton" />
                <div className="h-2.5 rounded-full w-1/2 skeleton" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
