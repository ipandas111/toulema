import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

interface AuthUser {
  id: string
  email: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: string | null; success: boolean }>
  signIn: (email: string, password: string) => Promise<{ error: string | null; success: boolean }>
  signOut: () => Promise<void>
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
    // 检查当前登录状态
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || ''
        })
      }
      setLoading(false)
    })

    // 监听登录状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || ''
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        return { error: error.message, success: false }
      }

      // 注册成功后自动登录
      if (data.user) {
        setUser({
          id: data.user.id,
          email: email
        })
        return { error: null, success: true }
      }

      return { error: '注册失败', success: false }
    } catch (e) {
      return { error: '网络错误', success: false }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message, success: false }
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          email: email
        })
        return { error: null, success: true }
      }

      return { error: '登录失败', success: false }
    } catch (e) {
      return { error: '网络错误', success: false }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// 获取用户 ID（登录用户或匿名用户）
export function getUserId(): string {
  // 这里会从 AuthContext 获取真实的 user ID
  // 如果未登录，使用匿名 ID
  const stored = localStorage.getItem('toulema_current_auth_user')
  if (stored) {
    try {
      const user = JSON.parse(stored)
      return user.id
    } catch {
      return getAnonymousUserId()
    }
  }
  return getAnonymousUserId()
}
