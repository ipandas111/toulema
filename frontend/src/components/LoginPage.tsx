import { useState } from 'react'
import { useAuth } from '../lib/auth'

export function LoginPage() {
  const { signUp, signIn, continueAsGuest } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('请填写邮箱和密码')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('密码至少6位')
      setLoading(false)
      return
    }

    const result = isLogin
      ? await signIn(email, password)
      : await signUp(email, password)

    if (result.error) {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1D1D1F]" style={{ fontFamily: 'Georgia, serif' }}>
            投了吗
          </h1>
          <p className="text-sm text-[#86868B] mt-2">智能求职投递管理</p>
        </div>

        {/* Login Form */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h2 className="text-lg font-semibold text-[#1D1D1F] mb-6">
            {isLogin ? '登录账号' : '注册账号'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border text-sm"
                style={{
                  background: '#F0F0F2',
                  borderColor: 'var(--color-border)',
                  color: '#1D1D1F'
                }}
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border text-sm"
                style={{
                  background: '#F0F0F2',
                  borderColor: 'var(--color-border)',
                  color: '#1D1D1F'
                }}
                placeholder="至少6位"
              />
            </div>

            {error && (
              <div className="text-sm text-red-500">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#FF9F0A', color: 'black' }}
            >
              {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
              className="text-sm"
              style={{ color: '#FF9F0A' }}
            >
              {isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
            </button>
          </div>

          {/* Guest mode */}
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button
              onClick={continueAsGuest}
              className="w-full py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'transparent',
                color: '#86868B',
                border: '1px solid var(--color-border)'
              }}
            >
              跳过登录，直接使用
            </button>
            <p className="text-xs text-[#86868B] text-center mt-2">
              数据仅保存在本地，换浏览器可能丢失
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
