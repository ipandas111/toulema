import { categorize, INDUSTRY_COLORS } from '../utils/categorize'
import type { IndustryCategory } from '../utils/categorize'
import { COLUMNS } from '../types'
import type { Job, JobStatus } from '../types'

export interface Filters {
  industry: IndustryCategory | null
  status: JobStatus | null
}

interface Props {
  jobs: Job[]
  filters: Filters
  onChange: (f: Filters) => void
}

export function FilterBar({ jobs, filters, onChange }: Props) {
  // Count by industry
  const industryCount: Partial<Record<IndustryCategory, number>> = {}
  jobs.forEach(j => {
    const cat = categorize(j.company)
    industryCount[cat] = (industryCount[cat] ?? 0) + 1
  })
  const industries = Object.entries(industryCount)
    .sort((a, b) => b[1] - a[1]) as [IndustryCategory, number][]

  // Count by status (only non-zero)
  const statusCount: Partial<Record<JobStatus, number>> = {}
  jobs.forEach(j => { statusCount[j.status] = (statusCount[j.status] ?? 0) + 1 })

  const pill = (
    active: boolean,
    color: string,
    label: string,
    count: number,
    onClick: () => void,
  ) => (
    <button
      key={label}
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium
                 transition-all duration-150 whitespace-nowrap"
      style={active
        ? { background: color + '22', color, border: `1px solid ${color}55` }
        : { background: 'transparent', color: '#636366', border: '1px solid #D2D2D7' }
      }
    >
      {active && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      )}
      {label}
      <span
        className="font-mono text-[10px] px-1 rounded"
        style={{ background: active ? color + '22' : '#0000000a', color: active ? color : '#86868B' }}
      >
        {count}
      </span>
    </button>
  )

  const hasFilter = filters.industry !== null || filters.status !== null

  return (
    <div className="flex items-center gap-2 mb-5 flex-wrap">
      {/* Reset */}
      {hasFilter && (
        <button
          onClick={() => onChange({ industry: null, status: null })}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium
                     bg-amber/10 text-amber border border-amber/30 transition-all hover:bg-amber/20"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth={2}>
            <path d="M3 3l10 10M13 3L3 13"/>
          </svg>
          清除筛选
        </button>
      )}

      {/* Divider label */}
      <span className="text-[10.5px] text-muted/50 uppercase tracking-widest font-medium">行业</span>

      {industries.map(([cat, count]) =>
        pill(
          filters.industry === cat,
          INDUSTRY_COLORS[cat],
          cat,
          count,
          () => onChange({ ...filters, industry: filters.industry === cat ? null : cat }),
        )
      )}

      <span className="text-[10.5px] text-muted/50 uppercase tracking-widest font-medium ml-2">状态</span>

      {COLUMNS.filter(c => (statusCount[c.status] ?? 0) > 0).map(c =>
        pill(
          filters.status === c.status,
          c.color,
          c.status,
          statusCount[c.status] ?? 0,
          () => onChange({ ...filters, status: filters.status === c.status ? null : c.status }),
        )
      )}
    </div>
  )
}
