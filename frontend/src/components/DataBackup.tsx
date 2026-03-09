import { useRef } from 'react'
import type { Job } from '../types'

const JOBS_KEY = 'toulema_jobs'

interface Props {
  userId: string | null
  jobs: Job[]
}

export function DataBackup({ userId, jobs }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    if (!userId) return

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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (!data.jobs || !Array.isArray(data.jobs)) {
          alert('文件格式错误')
          return
        }

        // 合并导入的数据（去重）
        const allJobs: Record<string, Job[]> = JSON.parse(localStorage.getItem(JOBS_KEY) || '{}')
        const existingJobs = allJobs[userId] || []
        const existingIds = new Set(existingJobs.map(j => j.id))

        const newJobs = data.jobs.filter((j: Job) => !existingIds.has(j.id))
        const merged = [...existingJobs, ...newJobs]

        allJobs[userId] = merged
        localStorage.setItem(JOBS_KEY, JSON.stringify(allJobs))

        alert(`成功导入 ${newJobs.length} 条记录`)
        window.location.reload()
      } catch {
        alert('解析文件失败')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  if (!userId) return null

  return (
    <div className="max-w-[1600px] mx-auto px-6 pb-4">
      <div className="bg-surface border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-[#1D1D1F]">数据备份</div>
            <div className="text-[11px] text-muted mt-1">当前共有 {jobs.length} 条投递记录</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-[12px] bg-[#F5F5F7] text-[#1D1D1F] rounded-lg hover:bg-[#E8E8ED] transition-colors"
            >
              导出数据
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-[12px] bg-[#F5F5F7] text-[#1D1D1F] rounded-lg hover:bg-[#E8E8ED] transition-colors"
            >
              导入数据
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
