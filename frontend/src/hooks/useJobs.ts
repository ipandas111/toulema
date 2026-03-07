import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Job, JobStatus } from '../types'
import type { User } from '@supabase/supabase-js'

export function useJobs(user: User | null) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    if (!user) {
      setJobs([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setJobs(data as Job[])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const sanitize = (job: Partial<Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => ({
    ...job,
    deadline: job.deadline || null,
    city:     job.city     || null,
    channel:  job.channel  || null,
    jd_url:   job.jd_url   || null,
    notes:    job.notes    || null,
  })

  const addJob = async (job: Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('Must be logged in')
    const { data, error } = await supabase
      .from('jobs')
      .insert([{ ...sanitize(job), user_id: user.id }])
      .select()
      .single()
    if (error) throw error
    setJobs(prev => [data as Job, ...prev])
    return data as Job
  }

  const updateJob = async (id: string, updates: Partial<Job>) => {
    const { data, error } = await supabase
      .from('jobs')
      .update({ ...sanitize(updates), updated_at: new Date().toISOString() })
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
