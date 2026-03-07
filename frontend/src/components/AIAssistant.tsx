import { useState } from 'react'
import { evaluateJD, generateJobAdvice, generateInterviewQuestions } from '../lib/ai/api'

type Tab = 'jd' | 'advice' | 'interview'

export function AIAssistant() {
  const [tab, setTab] = useState<Tab>('advice')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  // JD 评估
  const [jdContent, setJdContent] = useState('')
  const [jdResult, setJdResult] = useState<{
    score: number
    clarity: number
    responsibility: number
    requirement: number
    salary: number | null
    issues: string[]
    suggestions: string[]
  } | null>(null)

  // 求职建议
  const [direction, setDirection] = useState('')
  const [background, setBackground] = useState('')
  const [targetJob, setTargetJob] = useState('')

  // 面试问题
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [jobDesc, setJobDesc] = useState('')
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([])

  const handleEvaluateJD = async () => {
    if (!jdContent.trim()) return
    setLoading(true)
    try {
      const r = await evaluateJD(jdContent)
      setJdResult(r)
    } catch (e) {
      setResult('评估失败')
    }
    setLoading(false)
  }

  const handleGenerateAdvice = async () => {
    if (!direction.trim() || !targetJob.trim()) return
    setLoading(true)
    try {
      const r = await generateJobAdvice(direction, background, targetJob, [])
      setResult(r)
    } catch (e) {
      setResult('生成失败')
    }
    setLoading(false)
  }

  const handleGenerateQuestions = async () => {
    if (!company.trim() || !position.trim()) return
    setLoading(true)
    try {
      const q = await generateInterviewQuestions(company, position, jobDesc)
      setInterviewQuestions(q)
    } catch (e) {
      setInterviewQuestions([])
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-6 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🤖</span>
        <h2 className="text-lg font-semibold text-[#1D1D1F]">AI 求职助手</h2>
      </div>

      {/* Tab 选择 */}
      <div className="flex gap-2 mb-4 border-b border-border pb-2">
        {[
          { key: 'advice', label: '求职建议', icon: '💡' },
          { key: 'jd', label: 'JD 评估', icon: '📋' },
          { key: 'interview', label: '面试问题', icon: '❓' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key as Tab); setResult(''); setJdResult(null); setInterviewQuestions([]) }}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              tab === t.key
                ? 'bg-amber text-black'
                : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#E8E8ED]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 求职建议 */}
      {tab === 'advice' && (
        <div className="space-y-3">
          <div>
            <label className="text-[12px] text-[#86868B]">求职方向 *</label>
            <input
              value={direction}
              onChange={e => setDirection(e.target.value)}
              placeholder="如：半导体芯片、前端开发"
              className="w-full px-3 py-2 bg-[#F5F5F7] border-0 rounded-lg text-[13px] mt-1"
            />
          </div>
          <div>
            <label className="text-[12px] text-[#86868B]">个人背景</label>
            <textarea
              value={background}
              onChange={e => setBackground(e.target.value)}
              placeholder="如：211硕，专业电子，2年工作经验"
              rows={2}
              className="w-full px-3 py-2 bg-[#F5F5F7] border-0 rounded-lg text-[13px] mt-1 resize-none"
            />
          </div>
          <div>
            <label className="text-[12px] text-[#86868B]">目标岗位 *</label>
            <input
              value={targetJob}
              onChange={e => setTargetJob(e.target.value)}
              placeholder="如：TSE、现场应用工程师"
              className="w-full px-3 py-2 bg-[#F5F5F7] border-0 rounded-lg text-[13px] mt-1"
            />
          </div>
          <button
            onClick={handleGenerateAdvice}
            disabled={loading || !direction.trim() || !targetJob.trim()}
            className="w-full bg-amber text-black font-semibold py-2 rounded-lg text-[13px] disabled:opacity-50"
          >
            {loading ? 'AI 分析中...' : '生成求职建议'}
          </button>

          {result && (
            <div className="bg-[#F5F5F7] rounded-xl p-4 text-[13px] whitespace-pre-wrap max-h-96 overflow-y-auto">
              {result}
            </div>
          )}
        </div>
      )}

      {/* JD 评估 */}
      {tab === 'jd' && (
        <div className="space-y-3">
          <div>
            <label className="text-[12px] text-[#86868B]">粘贴 JD 内容</label>
            <textarea
              value={jdContent}
              onChange={e => setJdContent(e.target.value)}
              placeholder="粘贴职位描述内容..."
              rows={6}
              className="w-full px-3 py-2 bg-[#F5F5F7] border-0 rounded-lg text-[13px] mt-1 resize-none"
            />
          </div>
          <button
            onClick={handleEvaluateJD}
            disabled={loading || !jdContent.trim()}
            className="w-full bg-amber text-black font-semibold py-2 rounded-lg text-[13px] disabled:opacity-50"
          >
            {loading ? 'AI 评估中...' : '评估 JD 质量'}
          </button>

          {jdResult && (
            <div className="bg-[#F5F5F7] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-amber">{jdResult.score}</span>
                <span className="text-[13px] text-[#86868B]">/ 10 分</span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white rounded-lg p-2">
                  <div className="text-lg font-semibold">{jdResult.clarity}</div>
                  <div className="text-[10px] text-[#86868B]">清晰度</div>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <div className="text-lg font-semibold">{jdResult.responsibility}</div>
                  <div className="text-[10px] text-[#86868B]">职责明确</div>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <div className="text-lg font-semibold">{jdResult.requirement}</div>
                  <div className="text-[10px] text-[#86868B]">要求合理</div>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <div className="text-lg font-semibold">{jdResult.salary ?? '-'}</div>
                  <div className="text-[10px] text-[#86868B]">薪酬竞争力</div>
                </div>
              </div>

              {jdResult.issues.length > 0 && (
                <div>
                  <div className="text-[12px] font-medium text-red mb-1">⚠️ 发现问题</div>
                  <ul className="text-[11px] text-red/70 space-y-0.5">
                    {jdResult.issues.map((issue, i) => <li key={i}>• {issue}</li>)}
                  </ul>
                </div>
              )}

              {jdResult.suggestions.length > 0 && (
                <div>
                  <div className="text-[12px] font-medium text-green mb-1">💡 优化建议</div>
                  <ul className="text-[11px] text-green/70 space-y-0.5">
                    {jdResult.suggestions.map((suggestion, i) => <li key={i}>• {suggestion}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 面试问题 */}
      {tab === 'interview' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[12px] text-[#86868B]">目标公司 *</label>
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="如：德州仪器"
                className="w-full px-3 py-2 bg-[#F5F5F7] border-0 rounded-lg text-[13px] mt-1"
              />
            </div>
            <div>
              <label className="text-[12px] text-[#86868B]">目标岗位 *</label>
              <input
                value={position}
                onChange={e => setPosition(e.target.value)}
                placeholder="如：TSE"
                className="w-full px-3 py-2 bg-[#F5F5F7] border-0 rounded-lg text-[13px] mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-[12px] text-[#86868B]">岗位描述（可选）</label>
            <textarea
              value={jobDesc}
              onChange={e => setJobDesc(e.target.value)}
              placeholder="粘贴岗位描述..."
              rows={3}
              className="w-full px-3 py-2 bg-[#F5F5F7] border-0 rounded-lg text-[13px] mt-1 resize-none"
            />
          </div>
          <button
            onClick={handleGenerateQuestions}
            disabled={loading || !company.trim() || !position.trim()}
            className="w-full bg-amber text-black font-semibold py-2 rounded-lg text-[13px] disabled:opacity-50"
          >
            {loading ? 'AI 生成中...' : '生成面试问题'}
          </button>

          {interviewQuestions.length > 0 && (
            <div className="bg-[#F5F5F7] rounded-xl p-4 space-y-2">
              <div className="text-[12px] font-medium text-[#1D1D1F] mb-2">高频面试问题</div>
              {interviewQuestions.map((q, i) => (
                <div key={i} className="bg-white rounded-lg px-3 py-2 text-[13px]">
                  {i + 1}. {q}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
