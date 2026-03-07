import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface User {
  id: string
  username: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (username: string) => User
  signIn: (username: string) => User
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const USERS_KEY = 'toulema_users'
const CURRENT_USER_KEY = 'toulema_current_user'

function getStoredUsers(): Record<string, { id: string; username: string; createdAt: string }> {
  const stored = localStorage.getItem(USERS_KEY)
  return stored ? JSON.parse(stored) : {}
}

function saveUsers(users: Record<string, { id: string; username: string; createdAt: string }>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(CURRENT_USER_KEY)
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem(CURRENT_USER_KEY)
      }
    }
    setLoading(false)
  }, [])

  const signUp = (username: string): User => {
    const trimmed = username.trim()
    if (!trimmed || trimmed.length < 2) {
      throw new Error('用户名至少2个字符')
    }

    const users = getStoredUsers()
    const existing = Object.values(users).find(
      u => u.username.toLowerCase() === trimmed.toLowerCase()
    )
    if (existing) {
      throw new Error('用户名已存在')
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      username: trimmed
    }

    users[newUser.id] = {
      id: newUser.id,
      username: trimmed,
      createdAt: new Date().toISOString()
    }
    saveUsers(users)
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser))
    setUser(newUser)
    return newUser
  }

  const signIn = (username: string): User => {
    const trimmed = username.trim()
    if (!trimmed || trimmed.length < 2) {
      throw new Error('用户名至少2个字符')
    }

    const users = getStoredUsers()
    const found = Object.values(users).find(
      u => u.username.toLowerCase() === trimmed.toLowerCase()
    )

    if (!found) {
      throw new Error('用户不存在，请先注册')
    }

    const user: User = { id: found.id, username: found.username }
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
    setUser(user)
    return user
  }

  const signOut = () => {
    localStorage.removeItem(CURRENT_USER_KEY)
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

export function getCurrentUserId(): string | null {
  const stored = localStorage.getItem(CURRENT_USER_KEY)
  if (!stored) return null
  try {
    const user = JSON.parse(stored)
    return user.id
  } catch {
    return null
  }
}
