import { useState } from 'react'

interface ChatResponse {
  query: string
  intent: string
  intent_label: string
  answer: string
  sources: Array<{
    company?: string
    source?: string
    title?: string
    url?: string
  }>
}

export function AISearch() {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState<'experience' | 'jd_analysis' | 'company_review'>('experience')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null)
  const [error, setError] = useState('')

  const searchTypes = [
    { key: 'experience', label: '面经', placeholder: '搜索公司/岗位面经...' },
    { key: 'jd_analysis', label: 'JD分析', placeholder: '分析岗位值不值得投...' },
    { key: 'company_review', label: '公司评价', placeholder: '搜索公司口碑...' },
  ]

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setIsOpen(true)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          intent: searchType
        })
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setChatResponse(data)
    } catch (err) {
      console.error('Search error:', err)
      setError('搜索失败，请重试')
    }

    setLoading(false)
  }

  const currentType = searchTypes.find(t => t.key === searchType)!

  return (
    <div className="relative flex-shrink-0">
      {/* 搜索框区域 */}
      <div className="flex items-center gap-1">
        <select
          value={searchType}
          onChange={e => setSearchType(e.target.value as typeof searchType)}
          className="h-[34px] px-2 text-xs bg-[#F0F0F2] border-0 rounded-lg text-[#86868B] focus:outline-none cursor-pointer"
        >
          {searchTypes.map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>

        <div className="relative">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={currentType.placeholder}
            className="w-[180px] h-[34px] bg-[#F0F0F2] border-0 rounded-lg pl-9 pr-3 text-sm
                       text-[#1D1D1F] placeholder:text-[#AEAEB2] focus:outline-none focus:ring-2 focus:ring-amber/20 transition-all"
            style={{ background: '#F0F0F2' }}
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2] pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="h-[34px] px-3 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all
                     disabled:opacity-50"
          style={{ background: '#FF9F0A', color: 'black' }}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>AI搜索</span>
            </>
          )}
        </button>
      </div>

      {/* 搜索结果面板 */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[520px] bg-white rounded-2xl shadow-xl border border-border overflow-hidden z-50"
             style={{ maxHeight: '80vh' }}>
          {/* 面板头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-base">🔍</span>
              <span className="text-sm font-medium text-[#1D1D1F]">AI 回答</span>
              {chatResponse && (
                <span className="text-xs px-2 py-0.5 rounded bg-[#F0F0F2] text-[#86868B]">
                  {chatResponse.intent_label}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] text-[#86868B]"
            >
              ×
            </button>
          </div>

          {/* 内容区域 */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-2 border-[#FF9F0A] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-[#86868B]">AI 分析中...</span>
              </div>
            )}

            {error && (
              <div className="p-4 text-sm text-red-500">{error}</div>
            )}

            {!loading && !error && chatResponse && (
              <div className="p-4">
                {/* AI 回答 */}
                <div className="prose prose-sm max-w-none"
                     style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <div className="whitespace-pre-wrap text-[#1D1D1F]">
                    {chatResponse.answer}
                  </div>
                </div>

                {/* 来源信息 */}
                {chatResponse.sources && chatResponse.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-xs text-[#86868B] mb-2">参考来源：</div>
                    <div className="flex flex-wrap gap-2">
                      {chatResponse.sources.slice(0, 5).map((source, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded"
                          style={{ background: '#F5F5F7', color: '#86868B' }}
                        >
                          {source.company || source.title || '未知来源'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 底部提示 */}
                <div className="mt-4 pt-2 text-[10px] text-[#AEAEB2] text-center">
                  AI 回答基于公开面经数据，仅供参考
                </div>
              </div>
            )}

            {!loading && !error && !chatResponse && (
              <div className="p-8 text-center text-[#86868B] text-sm">
                输入问题获取 AI 面经分析
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
