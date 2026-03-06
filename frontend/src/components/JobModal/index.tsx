import { useState, useEffect } from 'react'
import { CHANNELS, CITIES, COLUMNS } from '../../types'
import type { Job, JobStatus } from '../../types'

interface Props {
  open: boolean
  job?: Job | null
  defaultStatus?: JobStatus
  onSave: (data: Omit<Job, 'id' | 'created_at' | 'updated_at'>) => void
  onClose: () => void
}

const empty = (): Omit<Job, 'id' | 'created_at' | 'updated_at'> => ({
  company: '', position: '', status: '待投递',
  city: '', channel: '', deadline: '', priority: 2, notes: '', jd_url: '',
})

export function JobModal({ open, job, defaultStatus, onSave, onClose }: Props) {
  const [form, setForm] = useState(empty())

  useEffect(() => {
    if (job) {
      setForm({
        company: job.company, position: job.position, status: job.status,
        city: job.city ?? '', channel: job.channel ?? '',
        deadline: job.deadline ?? '', priority: job.priority,
        notes: job.notes ?? '', jd_url: job.jd_url ?? '',
      })
    } else {
      setForm({ ...empty(), status: defaultStatus ?? '待投递' })
    }
  }, [job, defaultStatus, open])

  if (!open) return null

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company.trim() || !form.position.trim()) return
    onSave(form)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-surface border border-border rounded-xl w-full max-w-md mx-4 shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-white">{job ? '编辑投递' : '添加投递'}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* company + position */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted mb-1 block">公司 *</span>
              <input value={form.company} onChange={set('company')} required
                placeholder="如：德州仪器"
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white
                           placeholder:text-muted/50 focus:border-amber/60 focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-xs text-muted mb-1 block">岗位 *</span>
              <input value={form.position} onChange={set('position')} required
                placeholder="如：TSE"
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white
                           placeholder:text-muted/50 focus:border-amber/60 focus:outline-none" />
            </label>
          </div>

          {/* status + priority */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted mb-1 block">状态</span>
              <select value={form.status} onChange={set('status')}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-amber/60 focus:outline-none">
                {COLUMNS.map(c => <option key={c.status} value={c.status}>{c.status}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted mb-1 block">优先级</span>
              <select value={form.priority} onChange={set('priority')}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-amber/60 focus:outline-none">
                <option value={1}>⭐ 低</option>
                <option value={2}>⭐⭐ 中</option>
                <option value={3}>⭐⭐⭐ 高</option>
              </select>
            </label>
          </div>

          {/* channel + city */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted mb-1 block">投递渠道</span>
              <select value={form.channel} onChange={set('channel')}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-amber/60 focus:outline-none">
                <option value="">请选择</option>
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted mb-1 block">城市</span>
              <select value={form.city} onChange={set('city')}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:border-amber/60 focus:outline-none">
                <option value="">请选择</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          {/* deadline */}
          <label className="block">
            <span className="text-xs text-muted mb-1 block">截止日期</span>
            <input type="date" value={form.deadline} onChange={set('deadline')}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white
                         focus:border-amber/60 focus:outline-none" />
          </label>

          {/* jd_url */}
          <label className="block">
            <span className="text-xs text-muted mb-1 block">JD 链接</span>
            <input type="url" value={form.jd_url} onChange={set('jd_url')}
              placeholder="https://..."
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white
                         placeholder:text-muted/50 focus:border-amber/60 focus:outline-none" />
          </label>

          {/* notes */}
          <label className="block">
            <span className="text-xs text-muted mb-1 block">备注</span>
            <textarea value={form.notes} onChange={set('notes')} rows={2}
              placeholder="面试感受、联系人、下一步..."
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white
                         placeholder:text-muted/50 focus:border-amber/60 focus:outline-none resize-none" />
          </label>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button type="button" onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-lg py-2.5 text-sm transition-colors">
            取消
          </button>
          <button type="submit"
            className="flex-1 bg-amber hover:bg-amber/90 text-bg font-semibold rounded-lg py-2.5 text-sm transition-colors">
            {job ? '保存' : '添加'}
          </button>
        </div>
      </form>
    </div>
  )
}
