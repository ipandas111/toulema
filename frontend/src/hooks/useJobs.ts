import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Job, JobStatus } from '../types'

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setJobs(data as Job[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const addJob = async (job: Omit<Job, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('jobs')
      .insert([job])
      .select()
      .single()
    if (error) throw error
    setJobs(prev => [data as Job, ...prev])
    return data as Job
  }

  const updateJob = async (id: string, updates: Partial<Job>) => {
    const { data, error } = await supabase
      .from('jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setJobs(prev => prev.map(j => j.id === id ? data as Job : j))
  }

  const updateStatus = async (id: string, status: JobStatus) => {
    await updateJob(id, { status })
  }

  const deleteJob = async (id: string) => {
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (error) throw error
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  return { jobs, loading, error, addJob, updateJob, updateStatus, deleteJob, refetch: fetchJobs }
}
