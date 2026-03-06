import { describe, it, expect } from 'vitest'
import { differenceInDays, isPast, parseISO, addDays, subDays, format } from 'date-fns'

/** Mirrors the deadline logic in JobCard.tsx */
function getDeadlineWarning(deadline: string | null | undefined): 'expired' | 'urgent' | null {
  if (!deadline) return null
  const d = parseISO(deadline)
  const days = differenceInDays(d, new Date())
  if (isPast(d) && days < 0) return 'expired'
  if (days <= 3) return 'urgent'
  return null
}

const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
const today = new Date()

describe('截止日期警告逻辑', () => {

  describe('无截止日期', () => {
    it('null → null', () => expect(getDeadlineWarning(null)).toBeNull())
    it('undefined → null', () => expect(getDeadlineWarning(undefined)).toBeNull())
    it('空字符串 → null', () => expect(getDeadlineWarning('')).toBeNull())
  })

  describe('已过期', () => {
    it('昨天截止 → expired', () => {
      expect(getDeadlineWarning(fmt(subDays(today, 1)))).toBe('expired')
    })

    it('一周前截止 → expired', () => {
      expect(getDeadlineWarning(fmt(subDays(today, 7)))).toBe('expired')
    })

    it('30天前截止 → expired', () => {
      expect(getDeadlineWarning(fmt(subDays(today, 30)))).toBe('expired')
    })
  })

  describe('紧急（≤3天）', () => {
    it('明天截止 → urgent', () => {
      expect(getDeadlineWarning(fmt(addDays(today, 1)))).toBe('urgent')
    })

    it('后天截止 → urgent', () => {
      expect(getDeadlineWarning(fmt(addDays(today, 2)))).toBe('urgent')
    })

    it('3天后截止 → urgent', () => {
      expect(getDeadlineWarning(fmt(addDays(today, 3)))).toBe('urgent')
    })
  })

  describe('正常（>3天）', () => {
    // note: deadline is parsed as ISO midnight (00:00), new Date() has current time,
    // so differenceInDays(midnight+N, now_hh:mm) truncates → boundary shifts by ~1 day
    it('5天后截止 → null', () => {
      expect(getDeadlineWarning(fmt(addDays(today, 5)))).toBeNull()
    })

    it('一周后截止 → null', () => {
      expect(getDeadlineWarning(fmt(addDays(today, 7)))).toBeNull()
    })

    it('一个月后截止 → null', () => {
      expect(getDeadlineWarning(fmt(addDays(today, 30)))).toBeNull()
    })
  })
})

// ── DeadlineAlert 过滤逻辑 ────────────────────────────────────────────────────
import type { Job } from '../types'

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: crypto.randomUUID(),
  company: '测试公司',
  position: '工程师',
  status: '已投递',
  priority: 2,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
} as Job)

/** Mirrors DeadlineAlert filtering logic */
function getAlertJobs(jobs: Job[]) {
  return jobs
    .filter(j => j.deadline && j.status !== '已拒绝' && j.status !== 'Offer')
    .map(j => ({ job: j, days: differenceInDays(parseISO(j.deadline!), new Date()) }))
    .filter(({ days }) => days <= 7)
    .sort((a, b) => a.days - b.days)
}

describe('DeadlineAlert 过滤', () => {
  it('无 deadline 不显示', () => {
    const jobs = [makeJob({ deadline: undefined })]
    expect(getAlertJobs(jobs)).toHaveLength(0)
  })

  it('已拒绝不显示', () => {
    const jobs = [makeJob({ deadline: fmt(addDays(today, 1)), status: '已拒绝' })]
    expect(getAlertJobs(jobs)).toHaveLength(0)
  })

  it('Offer 不显示', () => {
    const jobs = [makeJob({ deadline: fmt(addDays(today, 1)), status: 'Offer' })]
    expect(getAlertJobs(jobs)).toHaveLength(0)
  })

  it('9天后截止不显示', () => {
    // 9 days from now midnight: differenceInDays truncates to 8, which is > 7
    const jobs = [makeJob({ deadline: fmt(addDays(today, 9)) })]
    expect(getAlertJobs(jobs)).toHaveLength(0)
  })

  it('7天内截止显示', () => {
    const jobs = [makeJob({ deadline: fmt(addDays(today, 5)) })]
    expect(getAlertJobs(jobs)).toHaveLength(1)
  })

  it('已过期（昨天）也显示', () => {
    const jobs = [makeJob({ deadline: fmt(subDays(today, 1)) })]
    expect(getAlertJobs(jobs)).toHaveLength(1)
  })

  it('按紧急程度排序，最紧急在前', () => {
    const jobs = [
      makeJob({ deadline: fmt(addDays(today, 6)) }),
      makeJob({ deadline: fmt(addDays(today, 1)) }),
      makeJob({ deadline: fmt(addDays(today, 3)) }),
    ]
    const result = getAlertJobs(jobs)
    expect(result[0].days).toBeLessThan(result[1].days)
    expect(result[1].days).toBeLessThan(result[2].days)
  })

  it('混合有效/无效条目', () => {
    const jobs = [
      makeJob({ deadline: fmt(addDays(today, 2)) }),              // 显示
      makeJob({ deadline: undefined }),                            // 不显示
      makeJob({ deadline: fmt(addDays(today, 9)) }),              // 不显示（>7天）
      makeJob({ deadline: fmt(addDays(today, 4)), status: '已拒绝' }), // 不显示
    ]
    expect(getAlertJobs(jobs)).toHaveLength(1)
  })
})
