import { useState, useEffect, useCallback } from 'react'
import type { Job, JobStatus } from '../types'

const JOBS_KEY = 'toulema_jobs'

function getStoredJobs(userId: string): Job[] {
  const allJobs: Record<string, Job[]> = JSON.parse(localStorage.getItem(JOBS_KEY) || '{}')
  return allJobs[userId] || []
}

function saveJobs(userId: string, jobs: Job[]) {
  const allJobs: Record<string, Job[]> = JSON.parse(localStorage.getItem(JOBS_KEY) || '{}')
  allJobs[userId] = jobs
  localStorage.setItem(JOBS_KEY, JSON.stringify(allJobs))
}

export function useJobs(userId: string | null) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    if (!userId) {
      setJobs([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = getStoredJobs(userId)
      setJobs(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch (e) {
      setError('加载数据失败')
    }
    setLoading(false)
  }, [userId])

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
