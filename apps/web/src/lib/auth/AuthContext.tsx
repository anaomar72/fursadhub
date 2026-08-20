import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { getAccessToken, setAccessToken } from './tokenStore'

interface AuthContextValue {
  accessToken: string | null
  isAuthenticated: boolean
  /** Foundation only — real login/refresh business logic lands in Phase 1. */
  signIn: (token: string) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(getAccessToken)

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      isAuthenticated: accessToken !== null,
      signIn: (token: string) => {
        setAccessToken(token)
        setAccessTokenState(token)
      },
      signOut: () => {
        setAccessToken(null)
        setAccessTokenState(null)
      },
    }),
    [accessToken],
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
