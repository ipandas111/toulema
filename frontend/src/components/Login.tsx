import { useState } from 'react'
import { useAuth } from '../lib/auth'

export function LoginPage() {
  const { signUp, signIn } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        signUp(username)
      } else {
        signIn(username)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-[#1D1D1F] mb-2">投了吗</h1>
          <p className="text-[15px] text-[#86868B]">求职投递管理看板</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] p-8">
          <h2 className="text-xl font-semibold text-[#1D1D1F] mb-6">
            {isSignUp ? '创建账号' : '登录'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">用户名</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                minLength={2}
                maxLength={20}
                className="w-full px-3 py-2.5 bg-[#F5F5F7] border-0 rounded-lg text-[14px]
                           text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none focus:ring-2 focus:ring-amber/40"
                placeholder="输入用户名"
              />
            </div>

            {error && (
              <div className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber text-black font-semibold py-2.5 rounded-lg text-[14px]
                         transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {loading ? '处理中...' : isSignUp ? '注册' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              className="text-[13px] text-[#0071E3] hover:underline"
            >
              {isSignUp ? '已有账号？登录' : '没有账号？注册'}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#86868B] mt-6">
          数据存储在本地浏览器，换设备后数据不互通
        </p>
      </div>
    </div>
  )
}
