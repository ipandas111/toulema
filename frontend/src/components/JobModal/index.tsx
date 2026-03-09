import { useState, useEffect } from 'react'
import { CHANNELS, CITIES, COLUMNS } from '../../types'
import type { Job, JobStatus } from '../../types'

interface Props {
  open: boolean
  job?: Job | null
  defaultStatus?: JobStatus
  onSave: (data: Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void
  onClose: () => void
}

const empty = (): Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'> => ({
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

  const f = `w-full bg-[#F5F5F7] border border-border rounded-xl px-3.5 py-2.5 text-[13px] text-[#1D1D1F]
             placeholder:text-muted/60 focus:outline-none focus:border-amber/50 focus:bg-white
             transition-all duration-150`
  const lbl = 'text-[10.5px] font-medium text-muted mb-1.5 block tracking-widest uppercase'

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="modal-panel bg-surface border border-border rounded-2xl w-full max-w-[440px]
                   mx-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="font-semibold text-[15px] text-[#1D1D1F] tracking-tight">
            {job ? '编辑投递' : '新建投递'}
          </h2>
          <button type="button" onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-black/[0.06]
                       hover:bg-black/[0.1] text-muted hover:text-[#1D1D1F] transition-colors text-sm leading-none">
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={lbl}>公司 *</span>
              <input value={form.company} onChange={set('company')} required
                placeholder="如：德州仪器" className={f} />
            </label>
            <label className="block">
              <span className={lbl}>岗位 *</span>
              <input value={form.position} onChange={set('position')} required
                placeholder="如：TSE" className={f} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={lbl}>状态</span>
              <select value={form.status} onChange={set('status')} className={f}>
                {COLUMNS.map(c => <option key={c.status} value={c.status}>{c.status}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={lbl}>优先级</span>
              <select value={form.priority} onChange={set('priority')} className={f}>
                <option value={1}>低</option>
                <option value={2}>中</option>
                <option value={3}>高</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={lbl}>投递渠道</span>
              <select value={form.channel} onChange={set('channel')} className={f}>
                <option value="">选择渠道</option>
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={lbl}>城市</span>
              <select value={form.city} onChange={set('city')} className={f}>
                <option value="">选择城市</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={lbl}>投递日期</span>
              <input type="date" value={form.deadline} onChange={set('deadline')} className={f} />
            </label>
            <label className="block">
              <span className={lbl}>JD 链接</span>
              <input type="url" value={form.jd_url} onChange={set('jd_url')}
                placeholder="https://..." className={f} />
            </label>
          </div>

          <label className="block">
            <span className={lbl}>备注</span>
            <textarea value={form.notes} onChange={set('notes')} rows={2}
              placeholder="面试感受、联系人、下一步..."
              className={`${f} resize-none`} />
          </label>
        </div>

        <div className="flex gap-2.5 px-6 pb-5 border-t border-border pt-4">
          <button type="button" onClick={onClose}
            className="flex-1 bg-black/[0.05] hover:bg-black/[0.08] text-[#1D1D1F]/70 rounded-xl py-2.5
                       text-[13px] font-medium transition-colors">
            取消
          </button>
          <button type="submit"
            className="flex-1 bg-amber text-black font-semibold rounded-xl py-2.5 text-[13px]
                       hover:opacity-85 active:scale-[0.98] transition-all">
            {job ? '保存修改' : '添加'}
          </button>
        </div>
      </form>
    </div>
  )
}
