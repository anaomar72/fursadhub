export interface RegisterResponse {
  email: string
  status: string
}

export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
}

export interface MeResponse {
  id: string
  email: string
  status: string
  preferredLocale: string
  emailVerifiedAt: string | null
  /** A flag, not a file id — the picture is fetched through its own route (CLAUDE.md section 47). */
  hasAvatar: boolean
}

export interface MessageResponse {
  message: string
}
