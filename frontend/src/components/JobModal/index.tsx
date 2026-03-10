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
  city: '', channel: '', deadline: '', applied_at: '', priority: 2, notes: '', jd_url: '',
})

export function JobModal({ open, job, defaultStatus, onSave, onClose }: Props) {
  const [form, setForm] = useState(empty())

  useEffect(() => {
    if (job) {
      setForm({
        company: job.company, position: job.position, status: job.status,
        city: job.city ?? '', channel: job.channel ?? '',
        deadline: job.deadline ?? '', applied_at: job.applied_at ?? '', priority: job.priority,
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

  const inputStyle = {
    background: '#F5F5F7',
    border: '1px solid transparent',
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(20px)' }}
      onClick={onClose}
    >
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="modal-panel w-full max-w-[420px] mx-4 bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: 'var(--shadow-xl)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold text-base text-[#1D1D1F]">
            {job ? '编辑投递' : '新建投递'}
          </h2>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       hover:bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] font-medium text-[#86868B] mb-2 block">公司</span>
              <input value={form.company} onChange={set('company')} required
                placeholder="输入公司名称"
                className="w-full px-4 py-3 text-sm rounded-xl transition-all"
                style={inputStyle} />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-[#86868B] mb-2 block">岗位</span>
              <input value={form.position} onChange={set('position')} required
                placeholder="输入岗位名称"
                className="w-full px-4 py-3 text-sm rounded-xl transition-all"
                style={inputStyle} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] font-medium text-[#86868B] mb-2 block">状态</span>
              <select value={form.status} onChange={set('status')}
                className="w-full px-4 py-3 text-sm rounded-xl transition-all"
                style={inputStyle}>
                {COLUMNS.map(c => <option key={c.status} value={c.status}>{c.status}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-[#86868B] mb-2 block">优先级</span>
              <select value={form.priority} onChange={set('priority')}
                className="w-full px-4 py-3 text-sm rounded-xl transition-all"
                style={inputStyle}>
                <option value={1}>低</option>
                <option value={2}>中</option>
                <option value={3}>高</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] font-medium text-[#86868B] mb-2 block">投递渠道</span>
              <select value={form.channel} onChange={set('channel')}
                className="w-full px-4 py-3 text-sm rounded-xl transition-all"
                style={inputStyle}>
                <option value="">选择渠道</option>
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-[#86868B] mb-2 block">城市</span>
              <select value={form.city} onChange={set('city')}
                className="w-full px-4 py-3 text-sm rounded-xl transition-all"
                style={inputStyle}>
                <option value="">选择城市</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] font-medium text-[#86868B] mb-2 block">投递日期</span>
              <input type="date" value={form.applied_at} onChange={set('applied_at')}
                className="w-full px-4 py-3 text-sm rounded-xl transition-all"
                style={inputStyle} />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-[#86868B] mb-2 block">截止日期</span>
              <input type="date" value={form.deadline} onChange={set('deadline')}
                className="w-full px-4 py-3 text-sm rounded-xl transition-all"
                style={inputStyle} />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-medium text-[#86868B] mb-2 block">JD 链接</span>
            <input type="url" value={form.jd_url} onChange={set('jd_url')}
              placeholder="https://..."
              className="w-full px-4 py-3 text-sm rounded-xl transition-all"
              style={inputStyle} />
          </label>

          <label className="block">
            <span className="text-[11px] font-medium text-[#86868B] mb-2 block">备注</span>
            <textarea value={form.notes} onChange={set('notes')} rows={2}
              placeholder="面试感受、联系人、下一步..."
              className="w-full px-4 py-3 text-sm rounded-xl transition-all resize-none"
              style={inputStyle} />
          </label>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium
                       hover:bg-[#F5F5F7] text-[#86868B] transition-colors">
            取消
          </button>
          <button type="submit"
            className="btn-primary flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#FF9F0A', color: 'black' }}>
            {job ? '保存修改' : '添加投递'}
          </button>
        </div>
      </form>
    </div>
  )
}
