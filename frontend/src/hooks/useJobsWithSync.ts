import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Job, JobStatus } from '../types'

const JOBS_KEY = 'toulema_jobs'

// 获取本地存储的 jobs
function getStoredJobs(userId: string): Job[] {
  try {
    const allJobs: Record<string, Job[]> = JSON.parse(localStorage.getItem(JOBS_KEY) || '{}')
    return allJobs[userId] || []
  } catch {
    return []
  }
}

// 保存到本地存储
function saveJobs(userId: string, jobs: Job[]) {
  try {
    const allJobs: Record<string, Job[]> = JSON.parse(localStorage.getItem(JOBS_KEY) || '{}')
    allJobs[userId] = jobs
    localStorage.setItem(JOBS_KEY, JSON.stringify(allJobs))
  } catch (e) {
    console.error('Failed to save jobs to localStorage:', e)
  }
}

// 扩展导入标记
const EXTENSION_IMPORT_KEY = 'toulema_extension_imported'

export function useJobsWithSync(userId: string | null) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [synced, setSynced] = useState(false)

  // 从 Supabase 同步
  const syncFromSupabase = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        // 转换为 Job 类型
        const supabaseJobs: Job[] = data.map(row => ({
          id: row.id,
          user_id: row.user_id,
          company: row.company,
          position: row.position,
          status: row.status as JobStatus,
          city: row.city,
          channel: row.channel,
          deadline: row.deadline,
          applied_at: row.applied_at,
          priority: row.priority as 1 | 2 | 3,
          notes: row.notes,
          jd_url: row.jd_url,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }))

        // 保存到本地存储
        saveJobs(uid, supabaseJobs)
        setJobs(supabaseJobs)
        setSynced(true)
        return supabaseJobs
      }
    } catch (e) {
      console.warn('Supabase sync failed, using localStorage:', e)
    }
    return null
  }, [])

  // 保存到 Supabase
  const saveToSupabase = async (job: Job) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .upsert({
          id: job.id,
          user_id: job.user_id,
          company: job.company,
          position: job.position,
          status: job.status,
          city: job.city,
          channel: job.channel,
          deadline: job.deadline,
          applied_at: job.applied_at,
          priority: job.priority,
          notes: job.notes,
          jd_url: job.jd_url,
          created_at: job.created_at,
          updated_at: job.updated_at,
        })

      if (error) throw error
    } catch (e) {
      console.warn('Failed to save to Supabase:', e)
    }
  }

  // 从 Supabase 删除
  const deleteFromSupabase = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId)

      if (error) throw error
    } catch (e) {
      console.warn('Failed to delete from Supabase:', e)
    }
  }

  // 从扩展导入
  const importFromExtension = useCallback(async (currentUserId: string) => {
    try {
      const allJobs: Record<string, Job[]> = JSON.parse(localStorage.getItem(JOBS_KEY) || '{}')
      const extJobs = allJobs[currentUserId] || []

      if (extJobs.length === 0) return

      const importedIds = new Set(JSON.parse(localStorage.getItem(EXTENSION_IMPORT_KEY) || '[]'))
      const newJobs = extJobs.filter((j: Job) => !importedIds.has(j.id))

      if (newJobs.length === 0) return

      const existingJobs = getStoredJobs(currentUserId)
      const existingIds = new Set(existingJobs.map(j => j.id))
      const jobsToAdd = newJobs.filter((j: Job) => !existingIds.has(j.id))

      if (jobsToAdd.length > 0) {
        const merged = [...jobsToAdd, ...existingJobs]
        saveJobs(currentUserId, merged)

        // 同步到 Supabase
        for (const job of jobsToAdd) {
          await saveToSupabase(job)
        }

        const allImported = [...Array.from(importedIds), ...jobsToAdd.map((j: Job) => j.id)]
        localStorage.setItem(EXTENSION_IMPORT_KEY, JSON.stringify(allImported))

        console.log(`从扩展导入了 ${jobsToAdd.length} 条记录`)
      }
    } catch (e) {
      console.error('Auto-import from extension failed:', e)
    }
  }, [])

  // 加载数据
  const fetchJobs = useCallback(async () => {
    if (!userId) {
      setJobs([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. 尝试从扩展导入
      await importFromExtension(userId)

      // 2. 尝试从 Supabase 同步
      const supabaseData = await syncFromSupabase(userId)

      // 3. 如果 Supabase 没数据，用本地存储
      if (!supabaseData) {
        const localData = getStoredJobs(userId)
        setJobs(localData.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ))
      }
    } catch (e) {
      console.error('Load jobs failed:', e)
      // 后备：使用本地存储
      const localData = getStoredJobs(userId)
      setJobs(localData)
      setError('数据加载异常，已使用本地缓存')
    }

    setLoading(false)
  }, [userId, importFromExtension, syncFromSupabase])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // 添加职位
  const addJob = async (job: Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) throw new Error('Must be logged in')

    const newJob: Job = {
      ...job,
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 同时更新状态、localStorage 和 Supabase
    const updated = [newJob, ...jobs]
    setJobs(updated)
    saveJobs(userId, updated)
    await saveToSupabase(newJob)

    return newJob
  }

  // 更新职位
  const updateJob = async (id: string, updates: Partial<Job>) => {
    if (!userId) return

    const updated = jobs.map(j =>
      j.id === id ? { ...j, ...updates, updated_at: new Date().toISOString() } : j
    )

    setJobs(updated)
    saveJobs(userId, updated)

    // 找到更新的 job 并同步
    const updatedJob = updated.find(j => j.id === id)
    if (updatedJob) {
      await saveToSupabase(updatedJob)
    }
  }

  // 更新状态
  const updateStatus = async (id: string, status: JobStatus) => {
    await updateJob(id, { status })
  }

  // 删除职位
  const deleteJob = async (id: string) => {
    if (!userId) return

    const updated = jobs.filter(j => j.id !== id)
    setJobs(updated)
    saveJobs(userId, updated)
    await deleteFromSupabase(id)
  }

  return {
    jobs,
    loading,
    error,
    synced,
    addJob,
    updateJob,
    updateStatus,
    deleteJob,
    refetch: fetchJobs
  }
}
