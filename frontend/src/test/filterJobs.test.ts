import { describe, it, expect } from 'vitest'
import { categorize } from '../utils/categorize'
import type { Job } from '../types'

// ── helpers ─────────────────────────────────────────────────────────────────
const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: crypto.randomUUID(),
  company: '德州仪器',
  position: 'TSE',
  status: '已投递',
  city: '上海',
  channel: 'Boss直聘',
  deadline: null as any,
  priority: 2,
  notes: null as any,
  jd_url: null as any,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

/** Mirrors the filter logic in App.tsx */
function applyFilters(
  jobs: Job[],
  search: string,
  industryFilter: string | null,
  statusFilter: string | null,
): Job[] {
  return jobs.filter(j => {
    const matchSearch = `${j.company} ${j.position} ${j.city ?? ''}`.toLowerCase()
      .includes(search.toLowerCase())
    const matchIndustry = !industryFilter || categorize(j.company) === industryFilter
    const matchStatus = !statusFilter || j.status === statusFilter
    return matchSearch && matchIndustry && matchStatus
  })
}

// ── search filter ────────────────────────────────────────────────────────────
describe('搜索过滤', () => {
  const jobs = [
    makeJob({ company: '德州仪器', position: 'TSE',    city: '上海' }),
    makeJob({ company: '华为',     position: '软件工程师', city: '深圳' }),
    makeJob({ company: '麦肯锡',   position: '咨询顾问',  city: '北京' }),
  ]

  it('空字符串返回所有', () => {
    expect(applyFilters(jobs, '', null, null)).toHaveLength(3)
  })

  it('按公司名精确匹配', () => {
    const r = applyFilters(jobs, '德州仪器', null, null)
    expect(r).toHaveLength(1)
    expect(r[0].company).toBe('德州仪器')
  })

  it('按岗位名匹配', () => {
    const r = applyFilters(jobs, 'TSE', null, null)
    expect(r).toHaveLength(1)
    expect(r[0].position).toBe('TSE')
  })

  it('按城市匹配', () => {
    const r = applyFilters(jobs, '深圳', null, null)
    expect(r).toHaveLength(1)
    expect(r[0].city).toBe('深圳')
  })

  it('搜索大小写不敏感', () => {
    const r = applyFilters(jobs, 'tse', null, null)
    expect(r).toHaveLength(1)
  })

  it('无匹配返回空数组', () => {
    expect(applyFilters(jobs, '不存在的公司XYZ', null, null)).toHaveLength(0)
  })

  it('部分匹配（子字符串）', () => {
    const r = applyFilters(jobs, '仪器', null, null)
    expect(r).toHaveLength(1)
    expect(r[0].company).toBe('德州仪器')
  })
})

// ── industry filter ──────────────────────────────────────────────────────────
describe('行业筛选', () => {
  const jobs = [
    makeJob({ company: '德州仪器' }),   // 半导体/芯片
    makeJob({ company: '麦肯锡' }),     // 咨询
    makeJob({ company: '宁德时代' }),   // 能源科技
    makeJob({ company: '字节跳动' }),   // 互联网/大厂
  ]

  it('null 不过滤', () => {
    expect(applyFilters(jobs, '', null, null)).toHaveLength(4)
  })

  it('只返回目标行业', () => {
    const r = applyFilters(jobs, '', '半导体/芯片', null)
    expect(r).toHaveLength(1)
    expect(r[0].company).toBe('德州仪器')
  })

  it('无该行业公司返回空', () => {
    expect(applyFilters(jobs, '', '金融/数据', null)).toHaveLength(0)
  })
})

// ── status filter ────────────────────────────────────────────────────────────
describe('状态筛选', () => {
  const jobs = [
    makeJob({ status: '待投递' }),
    makeJob({ status: '已投递' }),
    makeJob({ status: '一面' }),
    makeJob({ status: '已拒绝' }),
    makeJob({ status: 'Offer' }),
  ]

  it('null 不过滤', () => {
    expect(applyFilters(jobs, '', null, null)).toHaveLength(5)
  })

  it('精确匹配状态', () => {
    const r = applyFilters(jobs, '', null, '一面')
    expect(r).toHaveLength(1)
    expect(r[0].status).toBe('一面')
  })

  it('Offer 状态', () => {
    const r = applyFilters(jobs, '', null, 'Offer')
    expect(r).toHaveLength(1)
    expect(r[0].status).toBe('Offer')
  })
})

// ── combined filters ─────────────────────────────────────────────────────────
describe('组合筛选', () => {
  const jobs = [
    makeJob({ company: '德州仪器', status: '一面',  city: '上海' }),
    makeJob({ company: '德州仪器', status: '已拒绝', city: '北京' }),
    makeJob({ company: '麦肯锡',   status: '一面',  city: '北京' }),
  ]

  it('行业 + 状态', () => {
    const r = applyFilters(jobs, '', '半导体/芯片', '一面')
    expect(r).toHaveLength(1)
    expect(r[0].company).toBe('德州仪器')
    expect(r[0].status).toBe('一面')
  })

  it('搜索 + 行业', () => {
    const r = applyFilters(jobs, '上海', '半导体/芯片', null)
    expect(r).toHaveLength(1)
    expect(r[0].city).toBe('上海')
  })

  it('三重过滤无匹配', () => {
    const r = applyFilters(jobs, '深圳', '半导体/芯片', '一面')
    expect(r).toHaveLength(0)
  })
})
