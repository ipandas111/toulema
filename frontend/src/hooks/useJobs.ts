import { useState, useEffect, useCallback } from 'react'
import type { Job, JobStatus } from '../types'

const JOBS_KEY = 'toulema_jobs'

function getStoredJobs(userId: string): Job[] {
  try {
    const allJobs: Record<string, Job[]> = JSON.parse(localStorage.getItem(JOBS_KEY) || '{}')
    return allJobs[userId] || []
  } catch {
    return []
  }
}

function saveJobs(userId: string, jobs: Job[]) {
  try {
    const allJobs: Record<string, Job[]> = JSON.parse(localStorage.getItem(JOBS_KEY) || '{}')
    allJobs[userId] = jobs
    localStorage.setItem(JOBS_KEY, JSON.stringify(allJobs))
  } catch (e) {
    console.error('Failed to save jobs:', e)
  }
}

// 用于标记已自动导入的扩展记录
const EXTENSION_IMPORT_KEY = 'toulema_extension_imported'

export function useJobs(userId: string | null) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 从扩展自动导入数据
  const importFromExtension = useCallback(async (currentUserId: string) => {
    try {
      // 从 localStorage 获取扩展保存的数据
      const allJobs: Record<string, Job[]> = JSON.parse(localStorage.getItem(JOBS_KEY) || '{}')
      const extJobs = allJobs[currentUserId] || []

      if (extJobs.length === 0) return

      // 获取已导入的记录ID
      const importedIds = new Set(JSON.parse(localStorage.getItem(EXTENSION_IMPORT_KEY) || '[]'))

      // 过滤出未导入的新记录
      const newJobs = extJobs.filter((j: Job) => !importedIds.has(j.id))

      if (newJobs.length === 0) return

      // 合并到现有数据
      const existingJobs = getStoredJobs(currentUserId)
      const existingIds = new Set(existingJobs.map(j => j.id))
      const jobsToAdd = newJobs.filter((j: Job) => !existingIds.has(j.id))

      if (jobsToAdd.length > 0) {
        const merged = [...jobsToAdd, ...existingJobs]
        saveJobs(currentUserId, merged)

        // 标记为已导入
        const allImported = [...Array.from(importedIds), ...jobsToAdd.map((j: Job) => j.id)]
        localStorage.setItem(EXTENSION_IMPORT_KEY, JSON.stringify(allImported))

        console.log(`从扩展自动导入了 ${jobsToAdd.length} 条记录`)
      }
    } catch (e) {
      console.error('Auto-import from extension failed:', e)
    }
  }, [])

  const fetchJobs = useCallback(async () => {
    if (!userId) {
      setJobs([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      // 先尝试从扩展导入新数据
      await importFromExtension(userId)

      const data = getStoredJobs(userId)
      setJobs(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch (e) {
      setError('加载数据失败')
    }
    setLoading(false)
  }, [userId, importFromExtension])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const addJob = async (job: Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) throw new Error('Must be logged in')
    try {
      const newJob: Job = {
        ...job,
        id: crypto.randomUUID(),
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const updated = [newJob, ...jobs]
      saveJobs(userId, updated)
      setJobs(updated)
      return newJob
    } catch (e) {
      console.error('Failed to add job:', e)
      throw e
    }
  }

  const updateJob = async (id: string, updates: Partial<Job>) => {
    if (!userId) return
    const updated = jobs.map(j =>
      j.id === id ? { ...j, ...updates, updated_at: new Date().toISOString() } : j
    )
    saveJobs(userId, updated)
    setJobs(updated)
  }

  const updateStatus = async (id: string, status: JobStatus) => {
    await updateJob(id, { status })
  }

  const deleteJob = async (id: string) => {
    if (!userId) return
    const updated = jobs.filter(j => j.id !== id)
    saveJobs(userId, updated)
    setJobs(updated)
  }

  return { jobs, loading, error, addJob, updateJob, updateStatus, deleteJob, refetch: fetchJobs }
}
