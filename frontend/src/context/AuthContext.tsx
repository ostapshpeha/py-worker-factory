import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import { apiJson, apiFetch, setTokens, clearTokens } from '../lib/api'

export interface AuthUser {
  id: number
  email: string
  is_active: boolean
}

interface TokenResponse {
  access_token: string
  refresh_token: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setIsLoading(false)
      return
    }
    apiJson<AuthUser>('/routers/v1/user/me')
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiJson<TokenResponse>('/routers/v1/user/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setTokens(data.access_token, data.refresh_token)
    const me = await apiJson<AuthUser>('/routers/v1/user/me')
    setUser(me)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const data = await apiJson<TokenResponse>('/routers/v1/user/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setTokens(data.access_token, data.refresh_token)
    const me = await apiJson<AuthUser>('/routers/v1/user/me')
    setUser(me)
  }, [])

  const logout = useCallback(() => {
    // Fire-and-forget: revoke server-side refresh token, then clear locally
    apiFetch('/routers/v1/user/logout', { method: 'POST' }).catch(() => {})
    clearTokens()
    setUser(null)
  }, [])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await apiJson('/routers/v1/user/password-change', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })
    },
    [],
  )

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
