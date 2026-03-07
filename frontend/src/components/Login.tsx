import { useState } from 'react'
import { useAuth } from '../lib/auth'

export function LoginPage() {
  const { signUp, signIn } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // 将用户名转换为邮箱格式 (Supabase 需要邮箱格式)
  const toEmail = (name: string) => `${name}@toulema.local`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    const email = toEmail(username.trim())

    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password)

    if (error) {
      // 更友好的错误提示
      if (error.message.includes('Invalid login')) {
        setError('用户名或密码错误')
      } else if (error.message.includes('already registered')) {
        setError('该用户名已注册，请直接登录')
      } else {
        setError(error.message)
      }
    } else if (isSignUp) {
      setSuccess(true)
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

            <div>
              <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2.5 bg-[#F5F5F7] border-0 rounded-lg text-[14px]
                           text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none focus:ring-2 focus:ring-amber/40"
                placeholder="至少6位"
              />
            </div>

            {error && (
              <div className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {success && (
              <div className="text-[13px] text-green bg-green/10 rounded-lg px-3 py-2">
                注册成功！可以开始使用了。
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
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(false) }}
              className="text-[13px] text-[#0071E3] hover:underline"
            >
              {isSignUp ? '已有账号？登录' : '没有账号？注册'}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#86868B] mt-6">
          每个用户的数据完全隔离，互不可见
        </p>
      </div>
    </div>
  )
}
