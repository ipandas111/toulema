export type JobStatus =
  | '待投递'
  | '已投递'
  | '笔试'
  | '一面'
  | '终面'
  | 'Offer'
  | '已拒绝'

export interface Job {
  id: string
  user_id: string
  company: string
  position: string
  status: JobStatus
  city?: string
  channel?: string
  deadline?: string      // 截止日期
  applied_at?: string     // 投递日期
  priority: 1 | 2 | 3
  notes?: string
  jd_url?: string
  created_at: string
  updated_at: string
}

export const COLUMNS: { status: JobStatus; color: string }[] = [
  { status: '待投递', color: '#5A6A8A' },
  { status: '已投递', color: '#4F8EF7' },
  { status: '笔试',   color: '#A78BFA' },
  { status: '一面',   color: '#F0B429' },
  { status: '终面',   color: '#FB923C' },
  { status: 'Offer',  color: '#10B981' },
  { status: '已拒绝', color: '#EF4444' },
]

export const CHANNELS = ['Boss直聘', '牛客', '内推', '校招官网', '领英', '猎聘', '实习僧', '其他']
export const CITIES   = ['北京', '上海', '深圳', '广州', '杭州', '成都', '其他']
