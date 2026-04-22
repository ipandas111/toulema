import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Job, JobStatus } from '../types'

const JOBS_KEY = 'toulema_jobs'

function getStoredJobs(userId: string): Job[] {
  try {
    const allJobs: Record<string, Job[]> = JSON.parse(localStorage.getItem(JOBS_KEY) || '{}')
    return allJobs[userId] || []
  } catch { return [] }
}

function saveJobs(userId: string, jobs: Job[]) {
  try {
    const allJobs: Record<string, Job[]> = JSON.parse(localStorage.getItem(JOBS_KEY) || '{}')
    allJobs[userId] = jobs
    localStorage.setItem(JOBS_KEY, JSON.stringify(allJobs))
  } catch (e) { console.error('Failed to save jobs:', e) }
}

export function useJobsWithSync(userId: string | null, isAnonymous: boolean = false) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [synced, setSynced] = useState(false)

  const syncFromSupabase = useCallback(async (uid: string) => {
    if (isAnonymous) return null

    try {
      const { data, error } = await supabase
        .from('jobs').select('*').eq('user_id', uid)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        const supabaseJobs: Job[] = data.map(row => ({
          id: row.id, user_id: row.user_id, company: row.company,
          position: row.position, status: row.status as JobStatus,
          city: row.city, channel: row.channel, deadline: row.deadline,
          applied_at: row.applied_at, priority: row.priority as 1 | 2 | 3,
          notes: row.notes, jd_url: row.jd_url,
          created_at: row.created_at, updated_at: row.updated_at,
        }))
        saveJobs(uid, supabaseJobs)
        setJobs(supabaseJobs)
        setSynced(true)
        return supabaseJobs
      }
    } catch (e) { console.warn('Supabase sync failed:', e) }
    return null
  }, [isAnonymous])

  const saveToSupabase = async (job: Job) => {
    if (isAnonymous) return
    try {
      await supabase.from('jobs').upsert({
        id: job.id, user_id: job.user_id, company: job.company,
        position: job.position, status: job.status, city: job.city,
        channel: job.channel, deadline: job.deadline,
        applied_at: job.applied_at, priority: job.priority,
        notes: job.notes, jd_url: job.jd_url,
        created_at: job.created_at, updated_at: job.updated_at,
      })
    } catch (e) { console.warn('Failed to save to Supabase:', e) }
  }

  const deleteFromSupabase = async (jobId: string) => {
    if (isAnonymous) return
    try {
      await supabase.from('jobs').delete().eq('id', jobId)
    } catch (e) { console.warn('Failed to delete from Supabase:', e) }
  }

  const fetchJobs = useCallback(async () => {
    if (!userId) { setJobs([]); setLoading(false); return }

    setLoading(true); setError(null)
    try {
      const supabaseData = await syncFromSupabase(userId)
      if (!supabaseData) {
        const localData = getStoredJobs(userId)
        setJobs(localData.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      }
    } catch (e) {
      const localData = getStoredJobs(userId)
      setJobs(localData)
      setError('数据加载异常，已使用本地缓存')
    }
    setLoading(false)
  }, [userId, syncFromSupabase])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const addJob = async (job: Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) throw new Error('No user')
    const newJob: Job = {
      ...job, id: crypto.randomUUID(), user_id: userId,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    const updated = [newJob, ...jobs]
    setJobs(updated); saveJobs(userId, updated)
    await saveToSupabase(newJob)
    return newJob
  }

  const updateJob = async (id: string, updates: Partial<Job>) => {
    if (!userId) return
    const updated = jobs.map(j =>
      j.id === id ? { ...j, ...updates, updated_at: new Date().toISOString() } : j)
    setJobs(updated); saveJobs(userId, updated)
    const updatedJob = updated.find(j => j.id === id)
    if (updatedJob) await saveToSupabase(updatedJob)
  }

  const updateStatus = async (id: string, status: JobStatus) => { await updateJob(id, { status }) }

  const deleteJob = async (id: string) => {
    if (!userId) return
    const updated = jobs.filter(j => j.id !== id)
    setJobs(updated); saveJobs(userId, updated)
    await deleteFromSupabase(id)
  }

  return { jobs, loading, error, synced, addJob, updateJob, updateStatus, deleteJob, refetch: fetchJobs }
}
