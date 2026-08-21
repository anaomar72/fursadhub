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
}

export interface MessageResponse {
  message: string
}
