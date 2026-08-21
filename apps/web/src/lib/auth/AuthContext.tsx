import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getAccessToken, setAccessToken } from './tokenStore'
import { registerRefreshFn } from './refreshCoordinator'
import * as authApi from '../../features/auth/api/authApi'

interface AuthContextValue {
  accessToken: string | null
  isAuthenticated: boolean
  /** True until the initial silent refresh-on-app-start attempt has resolved. */
  isInitializing: boolean
  signIn: (token: string) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(getAccessToken)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const attemptRefresh = async (): Promise<string | null> => {
      try {
        const result = await authApi.refresh()
        setAccessToken(result.accessToken)
        setAccessTokenState(result.accessToken)
        return result.accessToken
      } catch {
        setAccessToken(null)
        setAccessTokenState(null)
        return null
      }
    }

    // Shared with lib/api/client.ts, which calls this on any 401 from a non-auth endpoint.
    registerRefreshFn(attemptRefresh)

    let cancelled = false
    attemptRefresh().finally(() => {
      if (!cancelled) {
        setIsInitializing(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      isAuthenticated: accessToken !== null,
      isInitializing,
      signIn: (token: string) => {
        setAccessToken(token)
        setAccessTokenState(token)
      },
      signOut: async () => {
        try {
          await authApi.logout()
        } finally {
          setAccessToken(null)
          setAccessTokenState(null)
        }
      },
    }),
    [accessToken, isInitializing],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
