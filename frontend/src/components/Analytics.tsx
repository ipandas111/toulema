import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { COLUMNS } from '../types'
import type { Job } from '../types'
import { categorize, INDUSTRY_COLORS } from '../utils/categorize'
import type { IndustryCategory } from '../utils/categorize'

interface Props { jobs: Job[] }

const COLORS = ['#0071E3', '#34C759', '#FF9F0A', '#FF453A', '#AF52DE', '#5E5CE6', '#636366']

export function Analytics({ jobs }: Props) {
  // Pipeline data — one bar per stage
  const pipeline = COLUMNS.map(col => ({
    name: col.status,
    count: jobs.filter(j => j.status === col.status).length,
    color: col.color,
  }))

  // Industry distribution (auto-categorized from company name)
  const industryMap: Record<string, number> = {}
  jobs.forEach(j => {
    const cat = categorize(j.company)
    industryMap[cat] = (industryMap[cat] ?? 0) + 1
  })
  const industries = Object.entries(industryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name,
      value,
      color: INDUSTRY_COLORS[name as IndustryCategory] ?? '#636366',
    }))

  // City distribution
  const cityMap: Record<string, number> = {}
  jobs.forEach(j => { if (j.city) cityMap[j.city] = (cityMap[j.city] ?? 0) + 1 })
  const cities = Object.entries(cityMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))

  const CustomBar = (props: any) => {
    const { x, y, width, height, color } = props
    return <rect x={x} y={y} width={width} height={height} fill={color} rx={4} />
  }

  const tooltipStyle = {
    background: '#fff',
    border: '1px solid #D2D2D7',
    borderRadius: 10,
    fontSize: 12,
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    padding: '6px 12px',
  }

  if (jobs.length === 0) return null

  return (
    <div className="max-w-[1600px] mx-auto px-6 pb-2 pt-0">
      <div className="grid grid-cols-3 gap-4">

        {/* Pipeline bar chart */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[13px] font-semibold text-[#1D1D1F] mb-4">投递漏斗</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pipeline} layout="vertical" barSize={14}
              margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={44}
                tick={{ fontSize: 11, fill: '#86868B' }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                contentStyle={tooltipStyle}
                formatter={(v) => [Number(v || 0) + ' 条', '数量']}
              />
              <Bar dataKey="count" shape={<CustomBar />} radius={[0, 4, 4, 0]}>
                {pipeline.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Industry pie */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[13px] font-semibold text-[#1D1D1F] mb-4">行业分布</div>
          {industries.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted text-sm">暂无数据</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={industries} cx="50%" cy="45%" innerRadius={52} outerRadius={78}
                  dataKey="value" paddingAngle={3}>
                  {industries.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v || 0) + ' 条', '']} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 11, color: '#86868B' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* City bar chart */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[13px] font-semibold text-[#1D1D1F] mb-4">城市分布</div>
          {cities.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted text-sm">暂无数据</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cities} barSize={28} margin={{ top: 0, right: 8, bottom: 0, left: -16 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#86868B' }}
                  axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#86868B' }}
                  axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v || 0) + ' 条', '数量']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {cities.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  )
}
