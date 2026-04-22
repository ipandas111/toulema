import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

interface AuthUser {
  id: string
  email: string
  isAnonymous: boolean
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: string | null; success: boolean }>
  signIn: (email: string, password: string) => Promise<{ error: string | null; success: boolean }>
  signOut: () => Promise<void>
  continueAsGuest: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// 本地匿名用户 ID 存储
const ANONYMOUS_USER_KEY = 'toulema_anonymous_user'

function getAnonymousUserId(): string {
  let userId = localStorage.getItem(ANONYMOUS_USER_KEY)
  if (!userId) {
    userId = crypto.randomUUID()
    localStorage.setItem(ANONYMOUS_USER_KEY, userId)
  }
  return userId
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 检查本地是否有游客 session
    const storedUser = localStorage.getItem('toulema_session')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        if (parsed.isAnonymous) {
          setUser(parsed)
          setLoading(false)
          return
        }
      } catch {
        // ignore
      }
    }

    // 检查 Supabase 登录状态
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const newUser = {
          id: session.user.id,
          email: session.user.email || '',
          isAnonymous: false
        }
        setUser(newUser)
        localStorage.setItem('toulema_session', JSON.stringify(newUser))
      }
      setLoading(false)
    })

    // 监听登录状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const newUser = {
          id: session.user.id,
          email: session.user.email || '',
          isAnonymous: false
        }
        setUser(newUser)
        localStorage.setItem('toulema_session', JSON.stringify(newUser))
      } else {
        setUser(null)
        localStorage.removeItem('toulema_session')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const continueAsGuest = () => {
    const guestUser: AuthUser = {
      id: getAnonymousUserId(),
      email: 'guest@local',
      isAnonymous: true
    }
    setUser(guestUser)
    localStorage.setItem('toulema_session', JSON.stringify(guestUser))
  }

  const signUp = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signUp({ email, password })
      if (error) return { error: error.message, success: false }
      if (data.user) {
        const newUser = { id: data.user.id, email, isAnonymous: false }
        setUser(newUser)
        localStorage.setItem('toulema_session', JSON.stringify(newUser))
        return { error: null, success: true }
      }
      return { error: '注册失败', success: false }
    } catch { return { error: '网络错误', success: false } }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message, success: false }
      if (data.user) {
        const newUser = { id: data.user.id, email, isAnonymous: false }
        setUser(newUser)
        localStorage.setItem('toulema_session', JSON.stringify(newUser))
        return { error: null, success: true }
      }
      return { error: '登录失败', success: false }
    } catch { return { error: '网络错误', success: false } }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    localStorage.removeItem('toulema_session')
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
