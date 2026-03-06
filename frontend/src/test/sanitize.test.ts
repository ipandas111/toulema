import { describe, it, expect } from 'vitest'
import type { Job } from '../types'

/** Mirrors sanitize() in useJobs.ts */
function sanitize(job: Partial<Omit<Job, 'id' | 'created_at' | 'updated_at'>>) {
  return {
    ...job,
    deadline: job.deadline || null,
    city:     job.city     || null,
    channel:  job.channel  || null,
    jd_url:   job.jd_url   || null,
    notes:    job.notes    || null,
  }
}

describe('sanitize — 空字符串转 null', () => {

  it('所有可选字段为空字符串 → null', () => {
    const result = sanitize({
      company: '德州仪器', position: 'TSE', status: '已投递', priority: 2,
      deadline: '', city: '', channel: '', jd_url: '', notes: '',
    })
    expect(result.deadline).toBeNull()
    expect(result.city).toBeNull()
    expect(result.channel).toBeNull()
    expect(result.jd_url).toBeNull()
    expect(result.notes).toBeNull()
  })

  it('有值的字段不被清空', () => {
    const result = sanitize({
      deadline: '2026-06-01',
      city: '上海',
      channel: 'Boss直聘',
      jd_url: 'https://example.com',
      notes: '面试感受很好',
    })
    expect(result.deadline).toBe('2026-06-01')
    expect(result.city).toBe('上海')
    expect(result.channel).toBe('Boss直聘')
    expect(result.jd_url).toBe('https://example.com')
    expect(result.notes).toBe('面试感受很好')
  })

  it('必填字段 company/position 不受影响', () => {
    const result = sanitize({ company: '华为', position: '软件工程师', status: '待投递', priority: 1 })
    expect(result.company).toBe('华为')
    expect(result.position).toBe('软件工程师')
  })

  it('undefined 字段 → null（falsy 统一处理）', () => {
    const result = sanitize({ deadline: undefined, city: undefined })
    expect(result.deadline).toBeNull()
    expect(result.city).toBeNull()
  })

  it('已是 null → 保持 null', () => {
    const result = sanitize({ deadline: null as any, notes: null as any })
    expect(result.deadline).toBeNull()
    expect(result.notes).toBeNull()
  })

  it('混合：部分有值，部分为空', () => {
    const result = sanitize({
      deadline: '2026-05-01',
      city: '',
      channel: '内推',
      jd_url: '',
      notes: '第一轮通过',
    })
    expect(result.deadline).toBe('2026-05-01')
    expect(result.city).toBeNull()
    expect(result.channel).toBe('内推')
    expect(result.jd_url).toBeNull()
    expect(result.notes).toBe('第一轮通过')
  })

  it('priority 数字字段不受 sanitize 影响', () => {
    const result = sanitize({ priority: 3 })
    expect(result.priority).toBe(3)
  })
})
