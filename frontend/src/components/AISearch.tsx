import { useState } from 'react'

type SearchType = 'experience' | 'jd' | 'growth' | 'company'

interface SearchResult {
  platform: string
  platformIcon: string
  title: string
  content: string
  url: string
  likes: number
  comments: number
  is_ai_summary?: boolean
}

const PLATFORM_INFO: Record<string, { name: string; icon: string; color: string }> = {
  xiaohongshu: { name: '小红书', icon: '📕', color: '#FF2442' },
  zhihu: { name: '知乎', icon: '🟦', color: '#0084FF' },
  niuke: { name: '牛客', icon: '🐂', color: '#EA4141' },
  liepin: { name: '猎聘', icon: '💼', color: '#3875F6' },
  boss: { name: 'BOSS', icon: '👔', color: '#007AFF' },
  ai_summary: { name: 'AI摘要', icon: '🤖', color: '#FF9F0A' },
  web: { name: '网页', icon: '🌐', color: '#86868B' },
}

export function AISearch() {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState<SearchType>('experience')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])

  const searchTypes = [
    { key: 'experience', label: '面经', placeholder: '搜索公司/岗位面经...' },
    { key: 'jd', label: 'JD分析', placeholder: '分析岗位值不值得投...' },
    { key: 'growth', label: '成长前景', placeholder: '了解岗位发展路径...' },
    { key: 'company', label: '公司评价', placeholder: '搜索公司口碑...' },
  ]

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/intel/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          search_type: searchType,
          max_results: 8
        })
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    }

    setLoading(false)
    setIsOpen(true)
  }

  const currentType = searchTypes.find(t => t.key === searchType)!

  return (
    <div className="relative flex-shrink-0">
      {/* 搜索框区域 */}
      <div className="flex items-center gap-1">
        {/* 搜索类型切换 */}
        <select
          value={searchType}
          onChange={e => setSearchType(e.target.value as SearchType)}
          className="h-[34px] px-2 text-xs bg-[#F0F0F2] border-0 rounded-lg text-[#86868B] focus:outline-none cursor-pointer"
        >
          {searchTypes.map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>

        {/* 搜索输入框 */}
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

        {/* 搜索按钮 */}
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
        <div className="absolute top-full right-0 mt-2 w-[480px] bg-white rounded-2xl shadow-xl border border-border overflow-hidden z-50">
          {/* 面板头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-base">🔍</span>
              <span className="text-sm font-medium text-[#1D1D1F]">AI 搜索结果</span>
              <span className="text-xs text-[#86868B]">「{query}」</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#86868B] bg-[#F5F5F7] px-2 py-1 rounded">
                来自小红书、知乎、牛客
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#F5F5F7] text-[#86868B]"
              >
                ×
              </button>
            </div>
          </div>

          {/* 结果列表 */}
          <div className="max-h-[400px] overflow-y-auto">
            {results.length === 0 ? (
              <div className="p-8 text-center text-[#86868B] text-sm">暂无搜索结果</div>
            ) : (
              <div className="divide-y divide-border">
                {results.map((result, i) => {
                  const platform = PLATFORM_INFO[result.platform as keyof typeof PLATFORM_INFO] || PLATFORM_INFO.web
                  const hasUrl = result.url && result.url.length > 0
                  return (
                    <div
                      key={i}
                      className={`p-4 transition-colors ${hasUrl ? 'hover:bg-[#F5F5F7] cursor-pointer' : ''}`}
                      onClick={() => hasUrl && window.open(result.url, '_blank')}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg flex-shrink-0">{result.platformIcon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ background: platform?.color + '15', color: platform?.color }}
                            >
                              {platform?.name}
                            </span>
                            <span className="text-sm font-medium text-[#1D1D1F] truncate">
                              {result.title}
                            </span>
                          </div>
                          <p className="text-xs text-[#86868B] line-clamp-3 mb-2">
                            {result.content}
                          </p>
                          {hasUrl && (
                            <div className="flex items-center gap-3 text-[10px] text-[#AEAEB2]">
                              <span>❤️ {result.likes}</span>
                              <span>💬 {result.comments}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 底部提示 */}
          <div className="px-4 py-2 bg-[#F5F5F7] border-t border-border">
            <p className="text-[10px] text-[#86868B] text-center">
              搜索结果由 AI 整合自公开网络，仅供参考
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
